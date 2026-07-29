import { useEffect, useState } from "react";
import { Loader2, Download, ExternalLink, FileText, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import SEOHead from "@/components/SEOHead";
import NotFound from "@/pages/NotFound";
import {
  getShowcaseSignedUrl,
  useShowcasePage,
  type ShowcaseAsset,
} from "@/hooks/useShowcasePage";

const formatSize = (bytes: number | null) => {
  if (!bytes) return null;
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value < 10 && unit > 0 ? 1 : 0)} ${units[unit]}`;
};

const AssetRow = ({ asset }: { asset: ShowcaseAsset }) => {
  const [pending, setPending] = useState(false);

  const handleOpen = async () => {
    if (asset.kind === "link" && asset.external_url) {
      window.open(asset.external_url, "_blank", "noopener,noreferrer");
      return;
    }
    if (!asset.storage_path) return;
    setPending(true);
    const url = await getShowcaseSignedUrl(asset.storage_path, 60 * 10);
    setPending(false);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  const size = formatSize(asset.file_size);

  return (
    <Card className="border-border/60 transition-colors hover:border-primary/40">
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {asset.kind === "link" ? <Link2 className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-foreground">{asset.label}</p>
          {(asset.description || size) && (
            <p className="truncate text-sm text-muted-foreground">
              {[asset.description, size].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={handleOpen} disabled={pending}>
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : asset.kind === "link" ? (
            <ExternalLink className="h-4 w-4" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          <span className="ml-2">{asset.kind === "link" ? "Open" : "Download"}</span>
        </Button>
      </CardContent>
    </Card>
  );
};

interface ShowcasePageProps {
  slug: "demo" | "pitch";
}

const ShowcasePage = ({ slug }: ShowcasePageProps) => {
  const { page, assets, videoSrc, loading, notFound } = useShowcasePage(slug);
  const [refreshedVideo, setRefreshedVideo] = useState<string | null>(null);

  useEffect(() => {
    setRefreshedVideo(null);
  }, [slug]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !page) return <NotFound />;

  const isEmbed = page.video_kind === "youtube" || page.video_kind === "vimeo";
  const src = refreshedVideo ?? videoSrc;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${page.title} | Docito`}
        description={page.subtitle || page.description || page.title}
        canonicalPath={`/${slug}`}
      />

      <section className="border-b border-border/60 bg-gradient-to-b from-primary/5 to-background">
        <div className="mx-auto max-w-5xl px-6 py-16 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            {page.title}
          </h1>
          {page.subtitle && (
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">{page.subtitle}</p>
          )}
          {page.cta_url && (
            <Button asChild size="lg" className="mt-8">
              <a href={page.cta_url} target="_blank" rel="noopener noreferrer">
                {page.cta_label || "Get started"}
              </a>
            </Button>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-12 px-6 py-12">
        {src && (
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
            <div className="aspect-video w-full bg-black">
              {isEmbed ? (
                <iframe
                  src={src}
                  title={page.title}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                />
              ) : (
                <video
                  key={src}
                  src={src}
                  poster={page.poster_url || undefined}
                  controls
                  playsInline
                  className="h-full w-full"
                  onError={async () => {
                    if (page.video_storage_path) {
                      setRefreshedVideo(await getShowcaseSignedUrl(page.video_storage_path));
                    }
                  }}
                />
              )}
            </div>
          </div>
        )}

        {page.description && (
          <div className="whitespace-pre-line text-base leading-relaxed text-muted-foreground">
            {page.description}
          </div>
        )}

        {assets.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">Resources</h2>
            <div className="grid gap-3">
              {assets.map((asset) => (
                <AssetRow key={asset.id} asset={asset} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShowcasePage;
