import { useMemo, useState } from "react";
import { useVerificationChecklist } from "@/hooks/useVerificationChecklist";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  doctorId: string; 
};

const COUNTRIES = [
  { iso2: "UZ", name: "Uzbekistan" },
  { iso2: "US", name: "United States" },
  { iso2: "GB", name: "United Kingdom" },
  { iso2: "DE", name: "Germany" },
  { iso2: "AE", name: "United Arab Emirates" },
];

async function ensureSubmission(doctorId: string, countryIso2: string) {
  const { data: existing, error: e1 } = await supabase
    .from("doctor_verification_submissions")
    .select("*")
    .eq("doctor_id", doctorId)
    .eq("country_iso2", countryIso2)
    .order("created_at", { ascending: false })
    .limit(1);

  if (e1) throw e1;
  if (existing && existing.length > 0) return existing[0];

  const { data: created, error: e2 } = await supabase
    .from("doctor_verification_submissions")
    .insert({ doctor_id: doctorId, country_iso2: countryIso2, status: "draft" })
    .select("*")
    .single();

  if (e2) throw e2;
  return created;
}

export default function DoctorVerificationForm({ doctorId }: Props) {
  const { t } = useTranslation("verification");

  const [countryIso2, setCountryIso2] = useState<string | null>(null);
  const { data, loading, error } = useVerificationChecklist(countryIso2, "doctor");

  const requiredItems = useMemo(() => (data?.items ?? []).filter((i) => i.required), [data]);
  const optionalItems = useMemo(() => (data?.items ?? []).filter((i) => !i.required), [data]);

  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSelectCountry(iso2: string) {
    setCountryIso2(iso2);
    setMsg(null);
    setSubmissionId(null);

    setBusy(true);
    try {
      const sub = await ensureSubmission(doctorId, iso2);
      setSubmissionId(sub.id);
    } catch (e: any) {
      setMsg(e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onUpload(docType: string, file: File) {
    if (!submissionId) return;

    setMsg(null);
    setBusy(true);
    try {
      // Storage bucket: "verification" (private recommended)
      const path = `${doctorId}/${submissionId}/${docType}/${Date.now()}-${file.name}`;

      const { error: upErr } = await supabase.storage.from("verification").upload(path, file, {
        cacheControl: "3600",
        upsert: true,
      });
      if (upErr) throw upErr;

      const { error: dbErr } = await supabase.from("doctor_verification_files").upsert({
        submission_id: submissionId,
        doc_type_code: docType,
        file_path: path,
        metadata: { filename: file.name, size: file.size, type: file.type },
      });

      if (dbErr) throw dbErr;

      setMsg(t("ui.uploadSuccess"));
    } catch (e: any) {
      setMsg(e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  async function submitForReview() {
    if (!submissionId || !countryIso2) return;

    setBusy(true);
    setMsg(null);
    try {
      const { error: e1 } = await supabase
        .from("doctor_verification_submissions")
        .update({ status: "under_review", submitted_at: new Date().toISOString() })
        .eq("id", submissionId);

      if (e1) throw e1;

      setMsg(t("ui.submittedForReview"));
    } catch (e: any) {
      setMsg(e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">{t("ui.title")}</h2>
            <p className="text-sm text-muted-foreground">{t("ui.subtitle")}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {COUNTRIES.map((c) => (
              <Button
                key={c.iso2}
                variant={countryIso2 === c.iso2 ? "default" : "outline"}
                onClick={() => onSelectCountry(c.iso2)}
                disabled={busy}
              >
                {c.name}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {error && (
        <Card className="p-4 border border-destructive/30">
          <div className="text-sm text-destructive">{error}</div>
        </Card>
      )}

      {(loading || busy) && (
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">{t("ui.loading")}</div>
        </Card>
      )}

      {msg && (
        <Card
          className={cn(
            "p-4",
            msg.toLowerCase().includes("error") ? "border border-destructive/30" : "border border-primary/20"
          )}
        >
          <div className="text-sm">{msg}</div>
        </Card>
      )}

      {data && submissionId && (
        <>
          <Card className="p-5">
            <h3 className="text-lg font-semibold mb-3">{t("ui.required")}</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {requiredItems.map((item) => (
                <DocUploadCard key={item.doc_type_code} item={item} onUpload={onUpload} />
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-lg font-semibold mb-3">{t("ui.optional")}</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {optionalItems.map((item) => (
                <DocUploadCard key={item.doc_type_code} item={item} onUpload={onUpload} />
              ))}
            </div>
          </Card>

          <div className="flex justify-end">
            <Button onClick={submitForReview} disabled={busy}>
              {t("ui.submit")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function DocUploadCard({
  item,
  onUpload,
}: {
  item: any;
  onUpload: (docType: string, file: File) => Promise<void>;
}) {
  const { t } = useTranslation("verification");

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="font-medium">{t(item.doc.label_key)}</div>
          <div className="text-xs text-muted-foreground">{t(item.doc.description_key)}</div>

          {item.validity_days ? (
            <div className="text-xs text-muted-foreground">
              {t("ui.validWithinDays", { days: item.validity_days })}
            </div>
          ) : null}

          {item.requires_source_verification ? (
            <div className="text-xs text-muted-foreground">{t("ui.sourceVerificationRequired")}</div>
          ) : null}
        </div>

        <label className="cursor-pointer">
          <input
            type="file"
            className="hidden"
            accept={(item.doc.accepted_mime || []).join(",")}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(item.doc_type_code, f);
              e.currentTarget.value = "";
            }}
          />
          <Button variant="outline" asChild>
            <span>{t("ui.upload")}</span>
          </Button>
        </label>
      </div>
    </Card>
  );
}
