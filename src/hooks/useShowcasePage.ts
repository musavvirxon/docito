import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ShowcaseVideoKind = "none" | "upload" | "youtube" | "vimeo" | "url";
export type ShowcaseAssetKind = "file" | "link";

export interface ShowcasePage {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  video_kind: ShowcaseVideoKind;
  video_url: string | null;
  video_storage_path: string | null;
  poster_url: string | null;
  cta_label: string | null;
  cta_url: string | null;
  is_published: boolean;
}

export interface ShowcaseAsset {
  id: string;
  page_id: string;
  label: string;
  description: string | null;
  kind: ShowcaseAssetKind;
  storage_path: string | null;
  external_url: string | null;
  file_size: number | null;
  mime_type: string | null;
  sort_order: number;
  is_visible: boolean;
}

export const SHOWCASE_BUCKET = "showcase";

/** Signed URL helper for the private showcase bucket. */
export async function getShowcaseSignedUrl(path: string, expiresIn = 60 * 60 * 6) {
  const { data, error } = await supabase.storage
    .from(SHOWCASE_BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error) return null;
  return data?.signedUrl ?? null;
}

/** Converts YouTube/Vimeo links to embeddable player URLs. */
export function toEmbedUrl(kind: ShowcaseVideoKind, url: string | null): string | null {
  if (!url) return null;
  if (kind === "youtube") {
    const match = url.match(
      /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([\w-]{6,})/,
    );
    const id = match?.[1];
    return id ? `https://www.youtube.com/embed/${id}?rel=0` : url;
  }
  if (kind === "vimeo") {
    const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    const id = match?.[1];
    return id ? `https://player.vimeo.com/video/${id}` : url;
  }
  return url;
}

interface UseShowcasePageResult {
  page: ShowcasePage | null;
  assets: ShowcaseAsset[];
  videoSrc: string | null;
  loading: boolean;
  notFound: boolean;
  refetch: () => Promise<void>;
}

export function useShowcasePage(slug: string): UseShowcasePageResult {
  const [page, setPage] = useState<ShowcasePage | null>(null);
  const [assets, setAssets] = useState<ShowcaseAsset[]>([]);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setNotFound(false);

    const { data: pageData, error } = await supabase
      .from("showcase_pages")
      .select("*")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();

    if (error || !pageData) {
      setPage(null);
      setAssets([]);
      setVideoSrc(null);
      setNotFound(true);
      setLoading(false);
      return;
    }

    const typedPage = pageData as unknown as ShowcasePage;
    setPage(typedPage);

    const { data: assetData } = await supabase
      .from("showcase_assets")
      .select("*")
      .eq("page_id", typedPage.id)
      .eq("is_visible", true)
      .order("sort_order", { ascending: true });

    setAssets((assetData ?? []) as unknown as ShowcaseAsset[]);

    if (typedPage.video_kind === "upload" && typedPage.video_storage_path) {
      setVideoSrc(await getShowcaseSignedUrl(typedPage.video_storage_path));
    } else if (typedPage.video_kind !== "none") {
      setVideoSrc(toEmbedUrl(typedPage.video_kind, typedPage.video_url));
    } else {
      setVideoSrc(null);
    }

    setLoading(false);
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  return { page, assets, videoSrc, loading, notFound, refetch: load };
}
