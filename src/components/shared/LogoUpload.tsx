// src/components/shared/LogoUpload.tsx
/**
 * Reusable logo upload widget.
 *
 * Accepts PNG, WebP, or SVG (transparent-friendly formats).
 * Uploads to the `entity-logos` Supabase storage bucket under
 * a path of `<userId>/<entityType>-<entityId>.png`.
 *
 * Props:
 *   currentUrl  – existing logo URL to preview
 *   onUpload    – called with the new public URL after a successful upload
 *   entityType  – e.g. "clinic", "pharmacy", "lab", "imaging", "doctor"
 *   entityId    – the row UUID for the owning entity
 *   label       – optional label override (defaults to "Logo")
 *   description – optional hint text shown beneath the upload area
 */

import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, X, ImageIcon, Loader2 } from "lucide-react";

interface LogoUploadProps {
  currentUrl?: string | null;
  onUpload: (url: string) => void;
  entityType: "clinic" | "pharmacy" | "lab" | "imaging" | "doctor";
  entityId: string;
  label?: string;
  description?: string;
}

const BUCKET = "entity-logos";
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ACCEPTED = ["image/png", "image/webp", "image/svg+xml"];

export function LogoUpload({
  currentUrl,
  onUpload,
  entityType,
  entityId,
  label = "Logo",
  description = "PNG or WebP with transparency recommended (max 2 MB)",
}: LogoUploadProps) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);

  const handleFile = async (file: File) => {
    if (!user) return;

    // Client-side validation
    if (!ACCEPTED.includes(file.type)) {
      toast.error("Please upload a PNG, WebP, or SVG file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("File is too large. Maximum size is 2 MB.");
      return;
    }

    setUploading(true);

    try {
      // Derive a deterministic, collision-free path for this entity's logo.
      // Storing under the user's folder so RLS passes.
      const ext = file.type === "image/svg+xml" ? "svg" : file.type === "image/webp" ? "webp" : "png";
      const path = `${user.id}/${entityType}-${entityId}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      // Bust the cache so the browser fetches the new version
      const publicUrl = `${data.publicUrl}?t=${Date.now()}`;

      setPreview(publicUrl);
      onUpload(publicUrl);
      toast.success(`${label} uploaded successfully`);
    } catch (err: any) {
      console.error("Logo upload error:", err);
      toast.error(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onUpload(""); // empty string signals "remove"
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <p className="text-xs text-muted-foreground">{description}</p>

      <div className="flex items-start gap-4">
        {/* Preview box — checkerboard background makes transparency visible */}
        <div
          className="relative flex-shrink-0 w-20 h-20 rounded-lg border border-dashed border-border overflow-hidden"
          style={{
            backgroundImage:
              "repeating-conic-gradient(#e5e7eb 0% 25%, white 0% 50%)",
            backgroundSize: "16px 16px",
          }}
        >
          {preview ? (
            <>
              <img
                src={preview}
                alt={label}
                className="w-full h-full object-contain p-1"
                onError={() => setPreview(null)}
              />
              <button
                type="button"
                onClick={handleRemove}
                className="absolute top-0.5 right-0.5 bg-background/80 rounded-full p-0.5 hover:bg-destructive hover:text-white transition-colors"
                aria-label="Remove logo"
              >
                <X className="h-3 w-3" />
              </button>
            </>
          ) : (
            <div className="flex items-center justify-center w-full h-full">
              <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
            </div>
          )}
        </div>

        {/* Upload button */}
        <div className="flex flex-col gap-2 justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="gap-2"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {uploading ? "Uploading…" : "Upload Logo"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Used on treatment plans, prescriptions, referrals & patient summaries
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".png,.webp,.svg,image/png,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}

export default LogoUpload;
