// src/components/verify/DocumentVerifySection.tsx
/**
 * DocumentVerifySection — used in Doctor, Pharmacy, Lab, Imaging dashboards
 *
 * Lets clinical staff verify any Docito document by:
 *  1. Typing / pasting a verification code
 *  2. Scanning a QR code with the device camera (BarcodeDetector API + video stream)
 *  3. Uploading an image containing a QR code (BarcodeDetector API)
 *
 * Sends { verification_code } to the `document-verify` edge function and renders
 * a full result card with all enriched information.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  QrCode,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Camera,
  CameraOff,
  Upload,
  Loader2,
  FileText,
  User,
  Stethoscope,
  Pill,
  ArrowRightLeft,
  Archive,
  Clock,
  ChevronRight,
  RefreshCw,
  Building2,
  FlaskConical,
  ScanLine,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// ─── types ────────────────────────────────────────────────────────────────────

interface VerifyResult {
  source: "live" | "archive" | "expired";
  entity_type: "treatment_plan" | "referral" | "prescription" | "patient" | string;
  entity_id: string;
  verification_code: string;
  deleted_at?: string | null;
  snapshot: any;
  enriched?: {
    patient_profile?: any;
    doctor?: any;
    referrer?: any;
    receiver?: any;
    pharmacy?: any;
  };
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function safeStr(v: unknown, max = 200): string {
  const s = typeof v === "string" ? v : v == null ? "" : String(v);
  return s.slice(0, max);
}

function fmtDate(v: unknown): string {
  if (!v) return "—";
  try { return format(new Date(String(v)), "dd MMM yyyy"); } catch { return String(v); }
}

function docTypeLabel(t: string) {
  const map: Record<string, string> = {
    treatment_plan: "Treatment Plan",
    referral: "Referral",
    prescription: "Prescription",
    patient: "Patient Profile",
  };
  return map[t] || t.replace(/_/g, " ");
}

function DocTypeIcon({ type, className }: { type: string; className?: string }) {
  const cls = cn("h-5 w-5", className);
  if (type === "treatment_plan") return <FileText className={cls} />;
  if (type === "referral") return <ArrowRightLeft className={cls} />;
  if (type === "prescription") return <Pill className={cls} />;
  if (type === "patient") return <User className={cls} />;
  return <FileText className={cls} />;
}

function SourceBadge({ source }: { source: string }) {
  if (source === "live") return (
    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 gap-1 border-0">
      <CheckCircle2 className="h-3 w-3" /> Verified — Active Record
    </Badge>
  );
  if (source === "expired") return (
    <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 gap-1 border-0">
      <Clock className="h-3 w-3" /> Verified — Token Expired
    </Badge>
  );
  return (
    <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 gap-1 border-0">
      <Archive className="h-3 w-3" /> Archived — Record Deleted
    </Badge>
  );
}

// ─── QR Scanner panel ────────────────────────────────────────────────────────

function QRScannerPanel({ onCode }: { onCode: (code: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [active, setActive] = useState(false);
  const [status, setStatus] = useState<"idle" | "scanning" | "found" | "error">("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [hasDetector] = useState(() => "BarcodeDetector" in window);

  const stopCamera = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setActive(false);
    setStatus("idle");
  }, []);

  const startCamera = useCallback(async () => {
    if (!hasDetector) {
      setStatus("error");
      setStatusMsg("QR scanning requires a Chromium-based browser. Please type the code manually.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setActive(true);
      setStatus("scanning");
      setStatusMsg("Point camera at QR code…");

      const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
      intervalRef.current = setInterval(async () => {
        if (!videoRef.current || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        ctx.drawImage(videoRef.current, 0, 0);
        try {
          const barcodes = await detector.detect(canvas);
          if (barcodes.length > 0) {
            const raw = barcodes[0].rawValue as string;
            // Extract code from full URL or use directly
            const extracted = extractCode(raw);
            if (extracted) {
              setStatus("found");
              setStatusMsg(`Found: ${extracted}`);
              stopCamera();
              onCode(extracted);
            }
          }
        } catch { /* ignore */ }
      }, 400);
    } catch (err: any) {
      setStatus("error");
      setStatusMsg(err?.message?.includes("Permission") ? "Camera permission denied." : "Failed to access camera.");
    }
  }, [hasDetector, onCode, stopCamera]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!hasDetector) { setStatus("error"); setStatusMsg("QR scanning requires a Chromium-based browser."); return; }
    try {
      const bitmap = await createImageBitmap(file);
      const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
      const barcodes = await detector.detect(bitmap);
      if (barcodes.length > 0) {
        const raw = barcodes[0].rawValue as string;
        const extracted = extractCode(raw);
        if (extracted) { setStatus("found"); setStatusMsg(`Found: ${extracted}`); onCode(extracted); }
        else { setStatus("error"); setStatusMsg("QR found but no verification code could be extracted."); }
      } else {
        setStatus("error"); setStatusMsg("No QR code found in image.");
      }
    } catch {
      setStatus("error"); setStatusMsg("Failed to read QR from image.");
    }
    e.target.value = "";
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {!active ? (
          <Button variant="outline" size="sm" className="gap-2" onClick={startCamera}>
            <Camera className="h-4 w-4" /> Scan with Camera
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="gap-2 text-destructive" onClick={stopCamera}>
            <CameraOff className="h-4 w-4" /> Stop Camera
          </Button>
        )}
        <Button variant="outline" size="sm" className="gap-2" onClick={() => fileRef.current?.click()}>
          <Upload className="h-4 w-4" /> Upload QR Image
        </Button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
      </div>

      {active && (
        <div className="relative rounded-xl overflow-hidden bg-black border border-border">
          <video ref={videoRef} className="w-full max-h-52 object-cover" muted playsInline />
          {/* Scanner overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-44 h-44 relative">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary rounded-br-lg" />
              <div className="absolute inset-x-0 animate-[scan_2s_ease-in-out_infinite] h-0.5 bg-primary/70 shadow-[0_0_8px_2px_rgba(59,130,246,0.5)]" />
            </div>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {(status === "error" || status === "found") && (
        <Alert className={cn("py-2", status === "error" ? "border-destructive/50 bg-destructive/5" : "border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/20")}>
          <AlertDescription className="text-sm flex items-center gap-2">
            {status === "error" ? <AlertTriangle className="h-4 w-4 text-destructive shrink-0" /> : <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
            {statusMsg}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// ─── extract code from QR URL or raw ─────────────────────────────────────────

function extractCode(raw: string): string | null {
  if (!raw) return null;
  // Full URL with ?code= param
  try {
    const url = new URL(raw);
    const code = url.searchParams.get("code") || url.searchParams.get("token");
    if (code) return code.trim();
  } catch { /* not a URL */ }
  // Raw code patterns: TP-xxx, RF-xxx, RX-xxx, PT-xxx, or plain ID
  const match = raw.match(/\b(TP|RF|RX|PT)-[A-Z0-9]{8,24}\b/i);
  if (match) return match[0].toUpperCase();
  // Fallback: return trimmed value if it looks like an ID
  const trimmed = raw.trim();
  if (trimmed.length >= 4 && trimmed.length <= 128 && !/\s/.test(trimmed)) return trimmed;
  return null;
}

// ─── Result display ───────────────────────────────────────────────────────────

function KV({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-3">
      <span className="text-xs font-medium text-muted-foreground min-w-[120px] shrink-0">{label}</span>
      <span className="text-sm text-foreground break-all">{value}</span>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {icon}
        {title}
      </div>
      <div className="pl-6 space-y-1.5">{children}</div>
    </div>
  );
}

function VerifyResultCard({ result }: { result: VerifyResult }) {
  const { source, entity_type, verification_code, snapshot, enriched, deleted_at } = result;
  const plan = snapshot?.treatment_plan;
  const ref = snapshot?.referral;
  const rx = snapshot?.prescription;
  const rxItems: any[] = snapshot?.items || [];
  const tokenSnap = entity_type === "patient" ? snapshot : null;

  const patient = enriched?.patient_profile;
  const doctor = enriched?.doctor;
  const referrer = enriched?.referrer;
  const receiver = enriched?.receiver;

  const typeColor = {
    treatment_plan: "from-blue-500 to-blue-600",
    referral: "from-violet-500 to-violet-600",
    prescription: "from-emerald-500 to-emerald-600",
    patient: "from-amber-500 to-amber-600",
  }[entity_type] || "from-slate-500 to-slate-600";

  return (
    <Card className="border-0 shadow-xl overflow-hidden">
      {/* Header strip */}
      <div className={cn("bg-gradient-to-r p-5 text-white", typeColor)}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
              <DocTypeIcon type={entity_type} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-lg leading-tight">{docTypeLabel(entity_type)}</p>
              <p className="text-white/70 text-xs font-mono mt-0.5">{verification_code}</p>
            </div>
          </div>
          <SourceBadge source={source} />
        </div>
      </div>

      <CardContent className="p-5 space-y-5">

        {/* Archive warning */}
        {source === "archive" && (
          <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
            <Archive className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-sm text-amber-800 dark:text-amber-300">
              This document was <strong>deleted</strong> on {fmtDate(deleted_at)}. The information below is from the archived snapshot at the time of deletion.
            </AlertDescription>
          </Alert>
        )}

        {/* Patient */}
        {patient && (
          <Section title="Patient" icon={<User className="h-3.5 w-3.5" />}>
            <KV label="Name" value={safeStr(patient.full_name)} />
            <KV label="Date of Birth" value={fmtDate(patient.date_of_birth)} />
            <KV label="Gender" value={safeStr(patient.gender)} />
            <KV label="Phone" value={safeStr(patient.phone)} />
            <KV label="Email" value={safeStr(patient.email)} />
          </Section>
        )}

        <Separator />

        {/* Document details */}
        {entity_type === "treatment_plan" && plan && (
          <Section title="Treatment Plan" icon={<FileText className="h-3.5 w-3.5" />}>
            <KV label="Title" value={safeStr(plan.title)} />
            <KV label="Status" value={safeStr(plan.status)} />
            <KV label="Created" value={fmtDate(plan.created_at)} />
            <KV label="Total Cost" value={plan.total_cost != null ? `${plan.total_cost}` : undefined} />
            <KV label="Notes" value={safeStr(plan.notes)} />
          </Section>
        )}

        {entity_type === "referral" && ref && (
          <Section title="Referral" icon={<ArrowRightLeft className="h-3.5 w-3.5" />}>
            <KV label="Referral #" value={safeStr(ref.referral_number)} />
            <KV label="Status" value={safeStr(ref.status)} />
            <KV label="Type" value={safeStr(ref.referral_type)} />
            <KV label="Created" value={fmtDate(ref.created_at)} />
            <KV label="Notes" value={safeStr(ref.notes)} />
          </Section>
        )}

        {entity_type === "prescription" && rx && (
          <Section title="Prescription" icon={<Pill className="h-3.5 w-3.5" />}>
            <KV label="Rx Number" value={safeStr(rx.prescription_number)} />
            <KV label="Status" value={safeStr(rx.status)} />
            <KV label="Prescribed" value={fmtDate(rx.prescribed_at)} />
            <KV label="Expires" value={fmtDate(rx.expires_at)} />
            <KV label="Refills" value={rx.refills_total > 0 ? `${rx.refills_remaining} / ${rx.refills_total}` : undefined} />
            <KV label="Diagnosis Code" value={safeStr(rx.diagnosis_code)} />
            <KV label="Notes" value={safeStr(rx.notes)} />
          </Section>
        )}

        {entity_type === "patient" && tokenSnap && (
          <Section title="Patient PDF Token" icon={<User className="h-3.5 w-3.5" />}>
            <KV label="Generated" value={fmtDate(tokenSnap.generated_at)} />
            <KV label="Expires" value={fmtDate(tokenSnap.expires_at)} />
            {tokenSnap.expired && (
              <div className="flex items-center gap-1.5 text-amber-600 text-sm font-medium">
                <Clock className="h-3.5 w-3.5" /> This patient profile token has expired
              </div>
            )}
          </Section>
        )}

        {/* Prescription items */}
        {entity_type === "prescription" && rxItems.length > 0 && (
          <>
            <Separator />
            <Section title="Medications" icon={<Pill className="h-3.5 w-3.5" />}>
              <div className="space-y-3">
                {rxItems.map((item: any, i: number) => (
                  <div key={i} className="bg-muted/40 rounded-lg p-3 space-y-1">
                    <p className="text-sm font-semibold">{i + 1}. {safeStr(item.medication_name)}</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                      {item.dosage && <KV label="Dosage" value={safeStr(item.dosage)} />}
                      {item.frequency && <KV label="Frequency" value={safeStr(item.frequency)} />}
                      {item.quantity && <KV label="Quantity" value={`${item.quantity}${item.unit ? ` ${item.unit}` : ""}`} />}
                    </div>
                    {item.instructions && <KV label="Instructions" value={safeStr(item.instructions)} />}
                  </div>
                ))}
              </div>
            </Section>
          </>
        )}

        {/* Doctor / Issuer */}
        {doctor && (
          <>
            <Separator />
            <Section title="Issuing Doctor" icon={<Stethoscope className="h-3.5 w-3.5" />}>
              <KV label="Name" value={safeStr(doctor.profile?.full_name)} />
              <KV label="Specialty" value={safeStr(doctor.doctor?.specialty)} />
              <KV label="License #" value={safeStr(doctor.doctor?.license_number)} />
              {doctor.practice && <KV label="Practice" value={safeStr(doctor.practice?.name)} />}
              {doctor.practice && <KV label="Practice City" value={safeStr(doctor.practice?.city)} />}
            </Section>
          </>
        )}

        {/* Referrer entity */}
        {referrer && (
          <>
            <Separator />
            <Section title="Referring Party" icon={<ChevronRight className="h-3.5 w-3.5" />}>
              {referrer.profile && <KV label="Doctor" value={safeStr(referrer.profile.full_name)} />}
              {referrer.doctor?.profile && <KV label="Doctor" value={safeStr(referrer.doctor.profile.full_name)} />}
              {referrer.doctor?.doctor && <KV label="Specialty" value={safeStr(referrer.doctor.doctor.specialty)} />}
              {referrer.practice && <KV label="Clinic" value={safeStr(referrer.practice.name)} />}
            </Section>
          </>
        )}

        {/* Receiver entity */}
        {receiver && (
          <>
            <Separator />
            <Section title="Receiving Party" icon={<Building2 className="h-3.5 w-3.5" />}>
              {receiver.pharmacy && <KV label="Pharmacy" value={safeStr(receiver.pharmacy.name)} />}
              {receiver.pharmacy && <KV label="Address" value={safeStr(receiver.pharmacy.address)} />}
              {receiver.lab_center && <KV label="Lab" value={safeStr(receiver.lab_center.name)} />}
              {receiver.imaging_center && <KV label="Imaging Center" value={safeStr(receiver.imaging_center.name)} />}
              {receiver.profile && <KV label="Doctor" value={safeStr(receiver.profile.full_name)} />}
              {receiver.doctor?.profile && <KV label="Doctor" value={safeStr(receiver.doctor.profile.full_name)} />}
            </Section>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  /** Optional: pre-fill the code (e.g. from URL query params on /verify page) */
  initialCode?: string;
}

export function DocumentVerifySection({ initialCode }: Props) {
  const [code, setCode] = useState(initialCode || "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-verify if initialCode provided
  useEffect(() => {
    if (initialCode) verify(initialCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  async function verify(rawCode?: string) {
    const c = (rawCode ?? code).trim();
    if (!c) { inputRef.current?.focus(); return; }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("document-verify", {
        body: { verification_code: c },
      });
      if (fnErr) throw fnErr;
      if (!data) throw new Error("No response from verification service");
      if ((data as any).error) throw new Error((data as any).error);
      setResult(data as VerifyResult);
      setShowScanner(false);
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes("404") || msg.includes("not found")) {
        setError("No document found with this verification code. Double-check the code and try again.");
      } else if (msg.includes("403") || msg.includes("Forbidden")) {
        setError("You don't have permission to verify this document.");
      } else {
        setError(msg || "Verification failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleQrCode(scannedCode: string) {
    setCode(scannedCode);
    setShowScanner(false);
    verify(scannedCode);
  }

  function reset() {
    setCode("");
    setResult(null);
    setError(null);
    setShowScanner(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Page header */}
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <ScanLine className="h-5 w-5 text-primary" />
          </div>
          Document Verification
        </h2>
        <p className="text-muted-foreground text-sm">
          Verify the authenticity of any Docito document — treatment plans, referrals, prescriptions, and patient profiles. Scan a QR code or enter the verification code printed on the document.
        </p>
      </div>

      {/* Search card */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <QrCode className="h-4 w-4 text-primary" />
            Enter or Scan Verification Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Input row */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                ref={inputRef}
                value={code}
                onChange={e => setCode(e.target.value)}
                onKeyDown={e => e.key === "Enter" && verify()}
                placeholder="TP-XXXX  /  RF-XXXX  /  RX-XXXX  /  PT-XXXX"
                className="pl-9 font-mono h-11 text-sm"
                disabled={loading}
              />
            </div>
            <Button onClick={() => verify()} disabled={loading || !code.trim()} className="h-11 px-5 gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Verify
            </Button>
          </div>

          {/* Code format hints */}
          <div className="flex flex-wrap gap-2">
            {[
              { prefix: "TP-", label: "Treatment Plan", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
              { prefix: "RF-", label: "Referral", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" },
              { prefix: "RX-", label: "Prescription", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
              { prefix: "PT-", label: "Patient Profile", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
            ].map(h => (
              <button
                key={h.prefix}
                onClick={() => { if (!code.startsWith(h.prefix)) setCode(h.prefix); inputRef.current?.focus(); }}
                className={cn("text-xs px-2.5 py-1 rounded-full font-mono font-medium transition-opacity hover:opacity-80", h.color)}
              >
                {h.prefix} {h.label}
              </button>
            ))}
          </div>

          <Separator />

          {/* Scanner toggle */}
          <div>
            <button
              onClick={() => setShowScanner(p => !p)}
              className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              <QrCode className="h-4 w-4" />
              {showScanner ? "Hide QR Scanner" : "Scan QR Code Instead"}
            </button>
            {showScanner && (
              <div className="mt-3">
                <QRScannerPanel onCode={handleQrCode} />
              </div>
            )}
          </div>

        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Alert className="border-destructive/50 bg-destructive/5">
          <XCircle className="h-4 w-4 text-destructive" />
          <AlertDescription className="flex items-center justify-between gap-4">
            <span className="text-sm text-destructive">{error}</span>
            <Button variant="ghost" size="sm" onClick={reset} className="shrink-0 gap-1.5 text-xs">
              <RefreshCw className="h-3.5 w-3.5" /> Try Again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Verification result</p>
            <Button variant="ghost" size="sm" onClick={reset} className="gap-1.5 text-xs">
              <RefreshCw className="h-3.5 w-3.5" /> Verify Another
            </Button>
          </div>
          <VerifyResultCard result={result} />
        </div>
      )}

    </div>
  );
}

export default DocumentVerifySection;
