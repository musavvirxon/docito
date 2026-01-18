// File: src/components/files/EntityFileManager.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, Trash2, Download, RefreshCw } from "lucide-react";

type EntityType = "practice" | "clinic" | "lab" | "imaging" | "pharmacy";

type FileRow = {
  id: string;
  category: string;
  bucket_id: string;
  object_path: string;
  original_filename: string | null;
  content_type: string | null;
  size_bytes: number | null;
  status: "pending" | "uploaded" | "deleted";
  created_by: string;
  created_at: string;
  updated_at: string;
};

type ListRes = { ok: boolean; files?: FileRow[]; error?: string };
type CreateUploadRes = {
  ok: boolean;
  file?: {
    id: string;
    bucket: string;
    objectPath: string;
    signedUrl: string;
    token?: string;
    path?: string;
    contentType: string;
  };
  error?: string;
};
type DownloadRes = { ok: boolean; signedUrl?: string; expiresIn?: number; error?: string };

function formatBytes(n?: number | null) {
  const v = typeof n === "number" ? n : 0;
  if (v < 1024) return `${v} B`;
  const kb = v / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}

async function uploadViaSignedUrl(signedUrl: string, file: File) {
  const res = await fetch(signedUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      "x-upsert": "true",
    },
    body: file,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Upload failed (${res.status}): ${txt || res.statusText}`);
  }
}

export default function EntityFileManager(props: {
  entityType: EntityType;
  entityId: string;
  category: string;
  title?: string;
  description?: string;
  accept?: string;
}) {
  const { entityType, entityId, category } = props;

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [picked, setPicked] = useState<File | null>(null);

  const accept = props.accept || ".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.txt";

  const list = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke<ListRes>("entity-files", {
        body: { action: "list", entityType, entityId, category },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed to load files");
      setFiles(data.files || []);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load files");
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    list();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId, category]);

  const hasPicked = useMemo(() => !!picked, [picked]);

  const onUpload = async () => {
    if (!picked) return;

    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke<CreateUploadRes>("entity-files", {
        body: {
          action: "createUpload",
          entityType,
          entityId,
          category,
          filename: picked.name,
          contentType: picked.type || "application/octet-stream",
        },
      });

      if (error) throw error;
      if (!data?.ok || !data.file?.signedUrl || !data.file?.objectPath) {
        throw new Error(data?.error || "Failed to create upload url");
      }

      await uploadViaSignedUrl(data.file.signedUrl, picked);

      await supabase.functions.invoke("entity-files", {
        body: {
          action: "markUploaded",
          entityType,
          entityId,
          objectPath: data.file.objectPath,
          sizeBytes: picked.size,
        },
      });

      toast.success("Uploaded");
      setPicked(null);
      await list();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const onDownload = async (objectPath: string) => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke<DownloadRes>("entity-files", {
        body: { action: "createDownload", entityType, entityId, objectPath, expiresIn: 900 },
      });
      if (error) throw error;
      if (!data?.ok || !data.signedUrl) throw new Error(data?.error || "Failed to create download url");

      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Download failed");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (objectPath: string) => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke<{ ok: boolean; error?: string }>("entity-files", {
        body: { action: "delete", entityType, entityId, objectPath },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Delete failed");
      toast.success("Deleted");
      await list();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>{props.title || "Files"}</CardTitle>
          {props.description ? (
            <div className="text-sm text-muted-foreground">{props.description}</div>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={list} disabled={loading || busy}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label>Upload ({category})</Label>
          <div className="flex flex-col md:flex-row gap-2 md:items-center">
            <Input
              type="file"
              accept={accept}
              disabled={busy}
              onChange={(e) => setPicked(e.target.files?.[0] || null)}
            />
            <Button onClick={onUpload} disabled={!hasPicked || busy}>
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Upload
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            Allowed: {accept}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : files.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6">No files uploaded yet.</div>
        ) : (
          <div className="space-y-2">
            {files.map((f) => (
              <div key={f.object_path} className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 rounded-lg border p-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{f.original_filename || f.object_path.split("/").pop()}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {f.content_type || "unknown"} · {formatBytes(f.size_bytes)} · {new Date(f.created_at).toLocaleString()}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="secondary">{f.category}</Badge>
                    <Badge variant={f.status === "uploaded" ? "default" : "outline"}>{f.status}</Badge>
                  </div>
                </div>

                <div className="flex items-center gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => onDownload(f.object_path)} disabled={busy}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => onDelete(f.object_path)} disabled={busy}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
