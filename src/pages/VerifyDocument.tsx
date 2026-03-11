// src/pages/VerifyDocument.tsx
/**
 * Public document verification page — /verify
 *
 * QR codes on Docito PDFs encode URLs like:
 *   https://docito.app/verify?type=treatment-plan&code=TP-XXXX
 *   https://docito.app/verify?type=prescription&code=RX-XXXX
 *   https://docito.app/verify?type=referral&code=RF-XXXX
 *   https://docito.app/verify?type=patient&token=PT-XXXX&pid=UUID
 *
 * If the user is logged in → calls the document-verify edge function and shows
 * the full enriched result via DocumentVerifySection.
 *
 * If not logged in → shows a clean landing page prompting them to sign in,
 * with the verification code pre-filled so after login they land straight back here.
 */

import { useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { DocumentVerifySection } from "@/components/verify/DocumentVerifySection";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, LogIn, QrCode, FileText, ArrowRightLeft, Pill, User } from "lucide-react";

export default function VerifyDocument() {
  const [params] = useSearchParams();
  const { user, loading } = useAuth();

  // Extract code from URL — support both ?code= and ?token= params
  const rawCode = params.get("code") || params.get("token") || "";
  const type = params.get("type") || "";

  // Normalise: if URL has a type prefix not in code, prepend it
  let initialCode = rawCode.trim();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Nav bar */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/logos/logo-full-light.png" alt="Docito" className="h-7 w-auto" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <span className="font-bold text-lg tracking-tight hidden sm:block">Docito</span>
          </Link>
          {!user && (
            <Button asChild size="sm" className="gap-2">
              <Link to={`/auth?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`}>
                <LogIn className="h-4 w-4" /> Sign In to Verify
              </Link>
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12 space-y-8">

        {/* Hero */}
        <div className="text-center space-y-3">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto ring-4 ring-primary/10">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Document Authenticity Check</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Every document issued through Docito carries a unique verification code. Scan or enter the code to confirm it&apos;s genuine.
          </p>
        </div>

        {user ? (
          /* Logged in → show full verify tool */
          <DocumentVerifySection initialCode={initialCode} />
        ) : (
          /* Not logged in → show what they can verify + prompt to sign in */
          <div className="space-y-6">
            {/* Code preview if present in URL */}
            {initialCode && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-4 flex items-center gap-4">
                  <QrCode className="h-8 w-8 text-primary shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">Verification code from QR scan</p>
                    <p className="font-mono font-bold text-lg text-primary">{initialCode}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Document types */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: FileText, label: "Treatment Plans", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
                { icon: ArrowRightLeft, label: "Referrals", color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/30" },
                { icon: Pill, label: "Prescriptions", color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
                { icon: User, label: "Patient Profiles", color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
              ].map(({ icon: Icon, label, color, bg }) => (
                <div key={label} className={`rounded-xl p-4 flex flex-col items-center gap-2 text-center ${bg}`}>
                  <Icon className={`h-6 w-6 ${color}`} />
                  <span className="text-xs font-medium">{label}</span>
                </div>
              ))}
            </div>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-6 text-center space-y-4">
                <div className="space-y-1">
                  <p className="font-semibold text-lg">Sign in to verify this document</p>
                  <p className="text-sm text-muted-foreground">
                    Document verification is available to authorised Docito clinical users — doctors, pharmacists, lab technicians and imaging staff.
                  </p>
                </div>
                <Button asChild size="lg" className="gap-2 w-full sm:w-auto px-8">
                  <Link to={`/auth?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`}>
                    <LogIn className="h-4 w-4" />
                    Sign In to Verify
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
