import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Submission = {
  id: string;
  doctor_id: string;
  country_iso2: string;
  status: string;
  submitted_at: string | null;
  created_at: string;
  review_notes: string | null;
};

type FileRow = {
  id: string;
  submission_id: string;
  doc_type_code: string;
  file_path: string;
  created_at: string;
  metadata: any;
};

function extractStoragePath(filePath: string) {
  return String(filePath || "").replace(/^\/+/, "");
}

export default function DoctorVerificationReview() {
  const [rows, setRows] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<Submission | null>(null);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [notes, setNotes] = useState("");

  async function load() {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("doctor_verification_submissions")
      .select("*")
      .in("status", ["under_review", "submitted"])
      .order("submitted_at", { ascending: true });

    if (error) setError(error.message);
    setRows((data as any) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function loadFiles(submissionId: string) {
    const { data, error } = await supabase
      .from("doctor_verification_files")
      .select("*")
      .eq("submission_id", submissionId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    setFiles((data as any) ?? []);
  }

  async function openFile(filePath: string) {
    try {
      const clean = extractStoragePath(filePath);
      const { data, error } = await supabase.storage.from("verification").createSignedUrl(clean, 60 * 10);
      if (error) throw error;
      if (!data?.signedUrl) throw new Error("No signed URL returned");
      window.open(data.signedUrl, "_blank");
    } catch (e: any) {
      setError(e.message ?? String(e));
    }
  }

  async function setStatus(id: string, status: "approved" | "rejected") {
    setError(null);

    const { error } = await supabase
      .from("doctor_verification_submissions")
      .update({ status, review_notes: notes || null })
      .eq("id", id);

    if (!error) {
      setSelected(null);
      setFiles([]);
      setNotes("");
      load();
    } else {
      setError(error.message);
    }
  }

  const selectedFilesByType = useMemo(() => {
    const map = new Map<string, FileRow>();
    for (const f of files) {
      if (!map.has(f.doc_type_code)) map.set(f.doc_type_code, f);
    }
    return Array.from(map.values());
  }, [files]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Doctor Verification Review</h1>
        <Button variant="outline" onClick={load} disabled={loading}>
          Refresh
        </Button>
      </div>

      {error && <Card className="p-4 border border-destructive/30">{error}</Card>}

      <div className="grid gap-4">
        {rows.map((r) => (
          <Card
            key={r.id}
            className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
          >
            <div className="space-y-1">
              <div className="font-medium">Doctor: {r.doctor_id}</div>
              <div className="text-sm text-muted-foreground">
                Country: {r.country_iso2} • Status: {r.status} • Submitted: {r.submitted_at ?? "—"}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={async () => {
                  setSelected(r);
                  setNotes(r.review_notes ?? "");
                  try {
                    await loadFiles(r.id);
                  } catch (e: any) {
                    setError(e.message ?? String(e));
                    setFiles([]);
                  }
                }}
              >
                View Files
              </Button>
              <Button onClick={() => setStatus(r.id, "approved")}>Approve</Button>
              <Button variant="destructive" onClick={() => setStatus(r.id, "rejected")}>
                Reject
              </Button>
            </div>
          </Card>
        ))}

        {!loading && rows.length === 0 && (
          <Card className="p-6 text-sm text-muted-foreground">No submissions waiting for review.</Card>
        )}
      </div>

      {selected && (
        <Card className="p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <div className="text-lg font-semibold">Selected submission</div>
              <div className="text-sm text-muted-foreground">
                {selected.id} • Doctor: {selected.doctor_id} • {selected.country_iso2}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setStatus(selected.id, "approved")}>Approve</Button>
              <Button variant="destructive" onClick={() => setStatus(selected.id, "rejected")}>
                Reject
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="font-medium">Review notes</div>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes for the doctor..." />
          </div>

          <div className="space-y-2">
            <div className="font-medium">Files (latest per type)</div>
            {selectedFilesByType.length === 0 ? (
              <div className="text-sm text-muted-foreground">No files uploaded.</div>
            ) : (
              <div className="grid gap-2 md:grid-cols-2">
                {selectedFilesByType.map((f) => (
                  <Card key={f.id} className="p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{f.doc_type_code}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {f.metadata?.filename ?? f.file_path}
                      </div>
                    </div>
                    <Button variant="outline" onClick={() => openFile(f.file_path)}>
                      Open
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
