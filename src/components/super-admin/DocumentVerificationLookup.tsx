// File: src/components/super-admin/DocumentVerificationLookup.tsx

import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Copy, RefreshCcw, CheckCircle2, AlertTriangle } from "lucide-react";

type VerifyResult = {
  source: "live" | "archive";
  entity_type: string;
  entity_id: string;
  verification_code: string;
  deleted_at?: string | null;
  snapshot: unknown;
  enriched?: Record<string, unknown>;
};

function prettyJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default function DocumentVerificationLookup() {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);

  const normalizedCode = useMemo(() => code.trim(), [code]);

  const summary = useMemo(() => {
    if (!result) return null;

    const snap = (result.snapshot || {}) as any;
    const tp = snap?.treatment_plan || snap?.treatmentPlan || null;
    const rf = snap?.referral || null;

    if (result.entity_type === "treatment_plan" && tp) {
      const procedures = Array.isArray(snap?.procedures) ? snap.procedures.length : 0;
      return {
        title: tp?.title || "Treatment plan",
        status: tp?.status || "unknown",
        total_cost: tp?.total_cost ?? tp?.totalCost ?? null,
        items: procedures,
      };
    }

    if (result.entity_type === "referral" && rf) {
      return {
        title: rf?.referral_number || rf?.referralNumber || "Referral",
        status: rf?.status || "unknown",
        total_cost: null,
        items: null,
      };
    }

    return {
      title: "Document",
      status: "unknown",
      total_cost: null,
      items: null,
    };
  }, [result]);

  const onLookup = async () => {
    if (!normalizedCode) {
      toast({
        variant: "destructive",
        title: "Enter a verification code",
        description: "Please paste the code from the PDF and try again.",
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("document-verify", {
        body: { verification_code: normalizedCode },
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Lookup failed",
          description: error.message || "Unable to verify the code.",
        });
        return;
      }

      setResult(data as VerifyResult);
      toast({
        title: "Verified",
        description: "Document details loaded successfully.",
      });
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Unexpected error",
        description: e?.message ?? "Something went wrong.",
      });
    } finally {
      setLoading(false);
    }
  };

  const onCopyJson = async () => {
    if (!result) return;
    const payload = {
      ...result,
      snapshot: result.snapshot,
      enriched: result.enriched,
    };
    try {
      await navigator.clipboard.writeText(prettyJson(payload));
      toast({ title: "Copied", description: "Verification details copied to clipboard." });
    } catch {
      toast({
        variant: "destructive",
        title: "Copy failed",
        description: "Clipboard is not available in this browser context.",
      });
    }
  };

  const onReset = () => {
    setCode("");
    setResult(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Document Verification</h1>
        <p className="text-muted-foreground mt-1">
          Lookup treatment plans and referrals by verification code. Works even if the original record was deleted.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lookup</CardTitle>
          <CardDescription>Paste the verification code from the PDF.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="verification_code">Verification code</Label>
            <Input
              id="verification_code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="TP-XXXXXXXXXXXX or RF-XXXXXXXXXXXX (or legacy hex code)"
              disabled={loading}
              autoComplete="off"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={onLookup} disabled={loading || !normalizedCode}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Looking up
                </>
              ) : (
                "Lookup"
              )}
            </Button>

            <Button variant="secondary" onClick={onReset} disabled={loading && !result}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>

            {result && (
              <Button variant="outline" onClick={onCopyJson}>
                <Copy className="mr-2 h-4 w-4" />
                Copy JSON
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {result && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card className="xl:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {result.source === "live" ? (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                )}
                Summary
              </CardTitle>
              <CardDescription>
                {result.source === "live" ? "Live record" : "Archived snapshot (record deleted)"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Entity</span>
                <span className="font-medium">{result.entity_type}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Entity ID</span>
                <span className="font-mono text-xs break-all">{result.entity_id}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Code</span>
                <span className="font-mono text-xs break-all">{result.verification_code}</span>
              </div>

              {result.source === "archive" && result.deleted_at && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Deleted</span>
                  <span className="font-medium">{new Date(result.deleted_at).toLocaleString()}</span>
                </div>
              )}

              {summary && (
                <div className="pt-2 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Title</span>
                    <span className="font-medium text-right">{summary.title}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Status</span>
                    <span className="font-medium">{summary.status}</span>
                  </div>
                  {summary.total_cost !== null && summary.total_cost !== undefined && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Total</span>
                      <span className="font-medium">{String(summary.total_cost)}</span>
                    </div>
                  )}
                  {summary.items !== null && summary.items !== undefined && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Items</span>
                      <span className="font-medium">{String(summary.items)}</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Details</CardTitle>
              <CardDescription>Full snapshot payload (includes all fields captured at generation / deletion time).</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap break-words rounded-lg border border-border bg-muted/30 p-4 text-xs leading-relaxed overflow-auto max-h-[70vh]">
{prettyJson({ snapshot: result.snapshot, enriched: result.enriched })}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
