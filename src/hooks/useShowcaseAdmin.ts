import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  SHOWCASE_BUCKET,
  getShowcaseSignedUrl,
  type ShowcaseAsset,
  type ShowcasePage,
} from "@/hooks/useShowcasePage";

export interface ShowcaseAdminState {
  pages: ShowcasePage[];
  assetsByPage: Record<string, ShowcaseAsset[]>;
  loading: boolean;
  busy: boolean;
  refetch: () => Promise<void>;
  savePage: (id: string, patch: Partial<ShowcasePage>) => Promise<boolean>;
  uploadVideo: (page: ShowcasePage, file: File) => Promise<boolean>;
  addLinkAsset: (pageId: string, label: string, url: string, description?: string) => Promise<boolean>;
  uploadFileAsset: (pageId: string, file: File, label?: string) => Promise<boolean>;
  updateAsset: (id: string, patch: Partial<ShowcaseAsset>) => Promise<boolean>;
  deleteAsset: (asset: ShowcaseAsset) => Promise<boolean>;
  previewUrl: (path: string) => Promise<string | null>;
}

const sanitize = (name: string) =>
  name.replace(/[^\w.\-]+/g, "-").replace(/-+/g, "-").toLowerCase();

export function useShowcaseAdmin(): ShowcaseAdminState {
  const [pages, setPages] = useState<ShowcasePage[]>([]);
  const [assetsByPage, setAssetsByPage] = useState<Record<string, ShowcaseAsset[]>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refetch = useCallback(async () => {
    setLoading(true);
    const { data: pageRows } = await supabase
      .from("showcase_pages")
      .select("*")
      .order("slug", { ascending: true });

    const typedPages = (pageRows ?? []) as unknown as ShowcasePage[];
    setPages(typedPages);

    const { data: assetRows } = await supabase
      .from("showcase_assets")
      .select("*")
      .order("sort_order", { ascending: true });

    const grouped: Record<string, ShowcaseAsset[]> = {};
    ((assetRows ?? []) as unknown as ShowcaseAsset[]).forEach((asset) => {
      grouped[asset.page_id] = [...(grouped[asset.page_id] ?? []), asset];
    });
    setAssetsByPage(grouped);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const savePage = useCallback(
    async (id: string, patch: Partial<ShowcasePage>) => {
      setBusy(true);
      const { id: _ignored, ...rest } = patch;
      const { error } = await supabase
        .from("showcase_pages")
        .update(rest as never)
        .eq("id", id);

      setBusy(false);
      if (error) return false;
      await refetch();
      return true;
    },
    [refetch],
  );

  const uploadVideo = useCallback(
    async (page: ShowcasePage, file: File) => {
      setBusy(true);
      const path = `${page.slug}/video/${Date.now()}-${sanitize(file.name)}`;
      const { error: uploadError } = await supabase.storage
        .from(SHOWCASE_BUCKET)
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (uploadError) {
        setBusy(false);
        return false;
      }
      const { error } = await supabase
        .from("showcase_pages")
        .update({ video_kind: "upload", video_storage_path: path, video_url: null })
        .eq("id", page.id);
      setBusy(false);
      if (error) return false;
      await refetch();
      return true;
    },
    [refetch],
  );

  const addLinkAsset = useCallback(
    async (pageId: string, label: string, url: string, description?: string) => {
      setBusy(true);
      const sortOrder = (assetsByPage[pageId]?.length ?? 0) + 1;
      const { error } = await supabase.from("showcase_assets").insert({
        page_id: pageId,
        label,
        description: description || null,
        kind: "link",
        external_url: url,
        sort_order: sortOrder,
      });
      setBusy(false);
      if (error) return false;
      await refetch();
      return true;
    },
    [assetsByPage, refetch],
  );

  const uploadFileAsset = useCallback(
    async (pageId: string, file: File, label?: string) => {
      setBusy(true);
      const page = pages.find((p) => p.id === pageId);
      const path = `${page?.slug ?? pageId}/files/${Date.now()}-${sanitize(file.name)}`;
      const { error: uploadError } = await supabase.storage
        .from(SHOWCASE_BUCKET)
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (uploadError) {
        setBusy(false);
        return false;
      }
      const sortOrder = (assetsByPage[pageId]?.length ?? 0) + 1;
      const { error } = await supabase.from("showcase_assets").insert({
        page_id: pageId,
        label: label || file.name,
        kind: "file",
        storage_path: path,
        file_size: file.size,
        mime_type: file.type || null,
        sort_order: sortOrder,
      });
      setBusy(false);
      if (error) return false;
      await refetch();
      return true;
    },
    [assetsByPage, pages, refetch],
  );

  const updateAsset = useCallback(
    async (id: string, patch: Partial<ShowcaseAsset>) => {
      setBusy(true);
      const { id: _ignored, page_id: _pageId, ...rest } = patch;
      const { error } = await supabase
        .from("showcase_assets")
        .update(rest as never)
        .eq("id", id);

      setBusy(false);
      if (error) return false;
      await refetch();
      return true;
    },
    [refetch],
  );

  const deleteAsset = useCallback(
    async (asset: ShowcaseAsset) => {
      setBusy(true);
      if (asset.storage_path) {
        await supabase.storage.from(SHOWCASE_BUCKET).remove([asset.storage_path]);
      }
      const { error } = await supabase.from("showcase_assets").delete().eq("id", asset.id);
      setBusy(false);
      if (error) return false;
      await refetch();
      return true;
    },
    [refetch],
  );

  return {
    pages,
    assetsByPage,
    loading,
    busy,
    refetch,
    savePage,
    uploadVideo,
    addLinkAsset,
    uploadFileAsset,
    updateAsset,
    deleteAsset,
    previewUrl: getShowcaseSignedUrl,
  };
}
