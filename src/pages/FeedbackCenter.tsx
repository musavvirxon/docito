import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bug, Lightbulb, Send, ThumbsUp, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { roleLabels, AppRole } from "@/lib/rbac";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

type FeedbackKind = "bug" | "feature";
type Status = "new" | "working" | "done";

type FeedbackRow = {
  id: string;
  created_at: string;
  created_by: string;
  kind: FeedbackKind;
  role: string;
  subject: string;
  description: string;
  severity: string | null;
  priority: string | null;
  page_path: string | null;
  language: string | null;
  status: Status;
  upvotes_count: number;
};

// All displayable roles for selection
const ALL_ROLES: string[] = [
  "patient",
  "doctor",
  "admin",
  "clinic_admin",
  "lab_admin",
  "pharmacy_admin",
  "imaging_admin",
  "staff",
  "clinic_staff",
  "receptionist",
  "nurse",
  "pharmacy_staff",
  "pharmacist",
  "lab_staff",
  "lab_technician",
  "imaging_staff",
  "internal_imaging_tech",
  "super_admin",
];

const statusBadgeVariant = (status: Status) => {
  if (status === "done") return "secondary";
  if (status === "working") return "default";
  return "outline";
};

export default function FeedbackCenter() {
  const { t } = useTranslation('common');
  const { toast } = useToast();
  const { user, profile, allRoles, activeRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const userRoles = useMemo(() => allRoles.length > 0 ? allRoles : [activeRole || "patient"], [allRoles, activeRole]);

  const defaultRole = useMemo<string>(() => {
    const firstOwned = ALL_ROLES.find((r) => userRoles.includes(r as AppRole));
    return firstOwned ?? "patient";
  }, [userRoles]);

  const [kind, setKind] = useState<FeedbackKind>("bug");
  const [selectedRole, setSelectedRole] = useState<string>(defaultRole);

  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");

  const [severity, setSeverity] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [priority, setPriority] = useState<"nice_to_have" | "important" | "urgent">("important");

  const [submitting, setSubmitting] = useState(false);

  // Global list
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  // My votes for current user (request_id set)
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set());

  useEffect(() => setSelectedRole(defaultRole), [defaultRole]);

  const canSubmitAsRole = (role: string) => userRoles.includes(role as AppRole);

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

  const Icon = header.icon;

  const loadList = async () => {
    setLoadingList(true);
    try {
      const { data, error } = await (supabase as any)
        .from("feedback_requests")
        .select("*")
        .order("upvotes_count", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setRows((data ?? []) as FeedbackRow[]);
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Could not load requests",
        description: e?.message ?? "Check RLS policy for feedback_requests select.",
      });
    } finally {
      setLoadingList(false);
    }
  };

  const loadMyVotes = async () => {
    if (!user) return;
    try {
      const { data, error } = await (supabase as any)
        .from("feedback_votes")
        .select("request_id")
        .eq("user_id", user.id);

      if (error) throw error;
      setMyVotes(new Set((data ?? []).map((x: any) => x.request_id)));
    } catch {
      // silent
    }
  };

  useEffect(() => {
    if (!user) return;
    void loadMyVotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    void loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

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
      toast({ variant: "destructive", title: "Missing information", description: "Fill Subject and Details." });
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
        language: typeof document !== "undefined" ? document.documentElement.lang : null,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        status: "new",
      };

      const { error } = await (supabase as any).from("feedback_requests").insert(payload);
      if (error) throw error;

      toast({ title: "Submitted", description: "Thanks — your request is now visible for upvotes." });

      setSubject("");
      setDescription("");
      await loadList();
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Could not submit",
        description: e?.message ?? "Ensure table and RLS policies exist.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleVote = async (requestId: string) => {
    if (!user) return;

    const has = myVotes.has(requestId);

    try {
      if (!has) {
        const { error } = await (supabase as any).from("feedback_votes").insert({ request_id: requestId, user_id: user.id });
        if (error) throw error;
        setMyVotes((prev) => new Set(prev).add(requestId));
      } else {
        const { error } = await (supabase as any)
          .from("feedback_votes")
          .delete()
          .eq("request_id", requestId)
          .eq("user_id", user.id);
        if (error) throw error;

        setMyVotes((prev) => {
          const n = new Set(prev);
          n.delete(requestId);
          return n;
        });
      }

      // Refresh list to show updated upvotes_count
      await loadList();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Vote failed", description: e?.message ?? "Check RLS policy for votes." });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-lg w-full">
          <CardHeader>
            <CardTitle>Feedback Center</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">Please sign in to view and submit requests.</p>
            <Button onClick={() => navigate("/auth")}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Top bar */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Feedback Center</h1>
            <p className="text-muted-foreground mt-1">
              Requests are sorted by <span className="font-medium text-foreground">upvotes</span>.
            </p>
          </div>
          <Button variant="outline" className="text-foreground" onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </Button>
        </div>

        <Separator className="my-6" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: role selector */}
          <Card className="lg:col-span-4">
            <CardHeader>
              <CardTitle className="text-lg">Submit as Role</CardTitle>
              <p className="text-sm text-muted-foreground">Roles you don't have are visible but disabled.</p>
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
                      <span className="font-medium text-foreground">{roleLabels[role as AppRole] ?? role}</span>
                      <span className="text-xs text-muted-foreground">{enabled ? "Available" : "Not available"}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{role}</div>
                  </button>
                );
              })}

              <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
                <ShieldAlert className="w-4 h-4 mt-0.5" />
                <span>Submissions are tagged with the selected role for triage and routing.</span>
              </div>
            </CardContent>
          </Card>

          {/* Right: submit form */}
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
                  <span className="font-medium text-foreground">{roleLabels[selectedRole as AppRole] ?? selectedRole}</span>
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
                      ? "Steps to reproduce, expected result, actual result, device/browser, screenshots…"
                      : "Who benefits, workflow, acceptance criteria, examples…"
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

        <Separator className="my-8" />

        {/* Global list */}
        <div className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Top Requests</h2>
              <p className="text-sm text-muted-foreground">Sorted by upvotes (then newest).</p>
            </div>
            <Button variant="outline" onClick={loadList} disabled={loadingList}>
              Refresh
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {loadingList ? (
              <Card><CardContent className="py-8 text-muted-foreground">Loading…</CardContent></Card>
            ) : rows.length === 0 ? (
              <Card><CardContent className="py-8 text-muted-foreground">No requests yet.</CardContent></Card>
            ) : (
              rows.map((r) => {
                const voted = myVotes.has(r.id);
                return (
                  <Card key={r.id} className="border-border/60">
                    <CardContent className="py-5 space-y-3">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{r.kind === "bug" ? "Bug" : "Feature"}</Badge>
                            <Badge variant={statusBadgeVariant(r.status)}>{r.status.toUpperCase()}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {roleLabels[r.role as AppRole] ?? r.role}
                            </span>
                          </div>
                          <div className="text-lg font-semibold text-foreground">{r.subject}</div>
                          <div className="text-sm text-muted-foreground line-clamp-2">{r.description}</div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant={voted ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleVote(r.id)}
                            className="gap-1.5"
                          >
                            <ThumbsUp className="w-4 h-4" />
                            {r.upvotes_count}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
