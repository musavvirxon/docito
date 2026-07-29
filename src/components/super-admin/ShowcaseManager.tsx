import { useEffect, useState } from "react";
import { Loader2, Save, Trash2, Upload, Plus, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useShowcaseAdmin } from "@/hooks/useShowcaseAdmin";
import type { ShowcasePage, ShowcaseVideoKind } from "@/hooks/useShowcasePage";

const VIDEO_KINDS: { value: ShowcaseVideoKind; label: string }[] = [
  { value: "none", label: "No video" },
  { value: "upload", label: "Uploaded file" },
  { value: "youtube", label: "YouTube link" },
  { value: "vimeo", label: "Vimeo link" },
  { value: "url", label: "Direct video URL" },
];

interface PageEditorProps {
  page: ShowcasePage;
  admin: ReturnType<typeof useShowcaseAdmin>;
}

const PageEditor = ({ page, admin }: PageEditorProps) => {
  const { toast } = useToast();
  const [form, setForm] = useState<ShowcasePage>(page);
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  useEffect(() => setForm(page), [page]);

  const assets = admin.assetsByPage[page.id] ?? [];

  const set = <K extends keyof ShowcasePage>(key: K, value: ShowcasePage[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    const ok = await admin.savePage(page.id, {
      title: form.title,
      subtitle: form.subtitle,
      description: form.description,
      video_kind: form.video_kind,
      video_url: form.video_url,
      poster_url: form.poster_url,
      cta_label: form.cta_label,
      cta_url: form.cta_url,
      is_published: form.is_published,
    });
    toast({
      title: ok ? "Saved" : "Save failed",
      description: ok ? `/${page.slug} updated.` : "Could not update this page.",
      variant: ok ? undefined : "destructive",
    });
  };

  const handleVideoUpload = async (file: File) => {
    const ok = await admin.uploadVideo(page, file);
    toast({
      title: ok ? "Video uploaded" : "Upload failed",
      description: ok ? "The video is now live on this page." : "Could not upload the video.",
      variant: ok ? undefined : "destructive",
    });
  };

  const handleFileUpload = async (file: File) => {
    const ok = await admin.uploadFileAsset(page.id, file);
    toast({
      title: ok ? "File added" : "Upload failed",
      variant: ok ? undefined : "destructive",
    });
  };

  const handleAddLink = async () => {
    if (!linkLabel.trim() || !linkUrl.trim()) return;
    const ok = await admin.addLinkAsset(page.id, linkLabel.trim(), linkUrl.trim());
    if (ok) {
      setLinkLabel("");
      setLinkUrl("");
    }
    toast({ title: ok ? "Link added" : "Failed to add link", variant: ok ? undefined : "destructive" });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              /{page.slug}
              <Badge variant={form.is_published ? "default" : "secondary"}>
                {form.is_published ? "Published" : "Draft"}
              </Badge>
            </CardTitle>
            <CardDescription>Public page content at docito.app/{page.slug}</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={`/${page.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_published}
                onCheckedChange={(v) => set("is_published", v)}
                id={`pub-${page.id}`}
              />
              <Label htmlFor={`pub-${page.id}`} className="text-sm">
                Published
              </Label>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => set("title", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Subtitle</Label>
              <Input
                value={form.subtitle ?? ""}
                onChange={(e) => set("subtitle", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              rows={5}
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>CTA label</Label>
              <Input
                value={form.cta_label ?? ""}
                onChange={(e) => set("cta_label", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>CTA URL</Label>
              <Input value={form.cta_url ?? ""} onChange={(e) => set("cta_url", e.target.value)} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Video source</Label>
              <Select
                value={form.video_kind}
                onValueChange={(v) => set("video_kind", v as ShowcaseVideoKind)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VIDEO_KINDS.map((k) => (
                    <SelectItem key={k.value} value={k.value}>
                      {k.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Poster image URL (optional)</Label>
              <Input
                value={form.poster_url ?? ""}
                onChange={(e) => set("poster_url", e.target.value)}
              />
            </div>
          </div>

          {form.video_kind !== "none" && form.video_kind !== "upload" && (
            <div className="space-y-2">
              <Label>Video link</Label>
              <Input
                placeholder="https://youtube.com/watch?v=..."
                value={form.video_url ?? ""}
                onChange={(e) => set("video_url", e.target.value)}
              />
            </div>
          )}

          {form.video_kind === "upload" && (
            <div className="space-y-2 rounded-lg border border-dashed border-border p-4">
              <Label>Upload video</Label>
              <p className="text-sm text-muted-foreground">
                {page.video_storage_path
                  ? `Current file: ${page.video_storage_path.split("/").pop()}`
                  : "No video uploaded yet."}
              </p>
              <Input
                type="file"
                accept="video/*"
                disabled={admin.busy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleVideoUpload(file);
                  e.target.value = "";
                }}
              />
            </div>
          )}

          <Button onClick={handleSave} disabled={admin.busy}>
            {admin.busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save changes
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Downloadable resources</CardTitle>
          <CardDescription>Files visitors can download and external links.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 rounded-lg border border-dashed border-border p-4">
              <Label className="flex items-center gap-2">
                <Upload className="h-4 w-4" /> Upload a file
              </Label>
              <Input
                type="file"
                disabled={admin.busy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFileUpload(file);
                  e.target.value = "";
                }}
              />
            </div>
            <div className="space-y-2 rounded-lg border border-dashed border-border p-4">
              <Label className="flex items-center gap-2">
                <Plus className="h-4 w-4" /> Add a link
              </Label>
              <Input
                placeholder="Label"
                value={linkLabel}
                onChange={(e) => setLinkLabel(e.target.value)}
              />
              <Input
                placeholder="https://..."
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
              />
              <Button size="sm" onClick={handleAddLink} disabled={admin.busy}>
                Add link
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {assets.length === 0 && (
              <p className="text-sm text-muted-foreground">No resources yet.</p>
            )}
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3"
              >
                <Input
                  className="w-56"
                  value={asset.label}
                  onChange={(e) => void admin.updateAsset(asset.id, { label: e.target.value })}
                />
                <Badge variant="outline">{asset.kind}</Badge>
                <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                  {asset.external_url || asset.storage_path}
                </span>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={asset.is_visible}
                    onCheckedChange={(v) => void admin.updateAsset(asset.id, { is_visible: v })}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => void admin.deleteAsset(asset)}
                    disabled={admin.busy}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const ShowcaseManager = () => {
  const admin = useShowcaseAdmin();

  if (admin.loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (admin.pages.length === 0) {
    return <p className="text-muted-foreground">No showcase pages configured.</p>;
  }

  return (
    <Tabs defaultValue={admin.pages[0].slug} className="space-y-6">
      <TabsList>
        {admin.pages.map((page) => (
          <TabsTrigger key={page.id} value={page.slug} className="capitalize">
            {page.slug}
          </TabsTrigger>
        ))}
      </TabsList>
      {admin.pages.map((page) => (
        <TabsContent key={page.id} value={page.slug}>
          <PageEditor page={page} admin={admin} />
        </TabsContent>
      ))}
    </Tabs>
  );
};

export default ShowcaseManager;
