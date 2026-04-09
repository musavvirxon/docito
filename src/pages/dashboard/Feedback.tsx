// File: src/pages/dashboard/Feedback.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ArrowLeft, Bug, Lightbulb, MessageSquareWarning, Send, Loader2 } from "lucide-react";
import { roleLabels } from "@/lib/rbac";
import { useTranslation } from "react-i18next";

type FeedbackType = "bug" | "feature" | "other";
type Severity = "low" | "medium" | "high";

export default function DashboardFeedback() {
  const { t } = useTranslation('dashboard');
  const { user, profile, allRoles, activeRole } = useAuth();
  const navigate = useNavigate();

  const [type, setType] = useState<FeedbackType>("bug");
  const [severity, setSeverity] = useState<Severity>("medium");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [steps, setSteps] = useState("");
  const [expected, setExpected] = useState("");
  const [actual, setActual] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setPageUrl(window.location.origin + window.location.pathname);
  }, []);

  const roleText = useMemo(() => roleLabels[activeRole] ?? activeRole, [activeRole]);

  const canSubmit = useMemo(() => {
    const t = title.trim();
    const m = message.trim();
    return t.length >= 4 && m.length >= 10;
  }, [title, message]);

  const icon = useMemo(() => {
    if (type === "bug") return <Bug className="h-5 w-5" />;
    if (type === "feature") return <Lightbulb className="h-5 w-5" />;
    return <MessageSquareWarning className="h-5 w-5" />;
  }, [type]);

  const handleSubmit = async () => {
    if (!user) {
      toast.error("You must be signed in to submit feedback.");
      navigate("/auth");
      return;
    }
    if (!canSubmit) {
      toast.error("Please add a title and a detailed message.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        type,
        severity,
        title: title.trim(),
        message: message.trim(),
        steps: steps.trim() || null,
        expected: expected.trim() || null,
        actual: actual.trim() || null,
        page_url: pageUrl || null,
        role: activeRole,
        roles: allRoles,
        user_email: profile?.email || user.email || null,
        user_name: profile?.full_name || null,
        app_version: (import.meta as any).env?.VITE_APP_VERSION ?? null,
        user_agent: navigator.userAgent,
      };

      const { data, error } = await supabase.functions.invoke("submit-feedback", {
        body: payload,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Thanks! Your feedback has been submitted.");
      setTitle("");
      setMessage("");
      setSteps("");
      setExpected("");
      setActual("");
      setType("bug");
      setSeverity("medium");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to submit feedback");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Feedback</h1>
          <p className="text-sm text-muted-foreground">
            Report issues or request features. Current role: <span className="font-medium">{roleText}</span>
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      <Card className="rounded-2xl">
        <CardHeader className="space-y-2">
          <CardTitle className="flex items-center gap-2">
            {icon} Submit feedback
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Include steps to reproduce and what you expected vs what happened. Screenshots can be added later by a team member if needed.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as FeedbackType)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bug">Bug</SelectItem>
                  <SelectItem value="feature">Feature request</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Severity</Label>
              <Select value={severity} onValueChange={(v) => setSeverity(v as Severity)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              className="rounded-xl"
              placeholder="Short summary (e.g., Search returns no results on Home page)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Minimum 4 characters.</p>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              className="rounded-xl min-h-[120px]"
              placeholder="What happened? Include context and impact."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Minimum 10 characters.</p>
          </div>

          <Separator />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Steps to reproduce (optional)</Label>
              <Textarea
                className="rounded-xl min-h-[100px]"
                placeholder={"1) Go to ...\n2) Click ...\n3) See error ..."}
                value={steps}
                onChange={(e) => setSteps(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Page URL (auto-filled)</Label>
              <Input className="rounded-xl" value={pageUrl} onChange={(e) => setPageUrl(e.target.value)} />
              <p className="text-xs text-muted-foreground">Edit if the issue is on a different page.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Expected behavior (optional)</Label>
              <Textarea
                className="rounded-xl min-h-[90px]"
                placeholder="What should have happened?"
                value={expected}
                onChange={(e) => setExpected(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Actual behavior (optional)</Label>
              <Textarea
                className="rounded-xl min-h-[90px]"
                placeholder="What actually happened?"
                value={actual}
                onChange={(e) => setActual(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="text-xs text-muted-foreground">
              Submitting as: <span className="font-medium">{profile?.full_name || user?.email || "Unknown"}</span>
            </div>

            <Button className="rounded-xl" onClick={handleSubmit} disabled={!canSubmit || submitting}>
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Submit
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
