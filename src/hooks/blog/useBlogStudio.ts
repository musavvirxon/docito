import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BLOG_DEFAULT_LANGUAGE, BLOG_LANGUAGES, type BlogLanguage } from "@/config/blog";
import { useBlogChecklist } from "@/hooks/blog/useBlogChecklist";
import { useBlogDrafts } from "@/hooks/blog/useBlogDrafts";
import { useBlogFilters } from "@/hooks/blog/useBlogFilters";
import { useBlogPreview } from "@/hooks/blog/useBlogPreview";
import {
  buildBlogStudioListItems,
  createBlogStudioDraftFromGroup,
  createEmptyBlogStudioDraft,
  getPublishedBlogStudioGroup,
  hydrateBlogStudioRowsFromContent,
  requestBlogStudioGroupDelete,
  submitBlogStudioDraftForPublish,
  updateBlogDraftSharedFields,
  updateBlogDraftTranslation,
  type BlogStudioDeleteOptions,
  type BlogStudioDraft,
  type BlogStudioListItem,
  type BlogStudioSubmitOptions,
} from "@/lib/blog/studio-api";
import type { BlogPostGroup, BlogPostRecord } from "@/types/blog";

export const BLOG_STUDIO_QUERY_KEY = ["blog-studio", "content"];

export const useBlogStudio = () => {
  const queryClient = useQueryClient();
  const drafts = useBlogDrafts();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const contentQuery = useQuery({
    queryKey: BLOG_STUDIO_QUERY_KEY,
    queryFn: async () => hydrateBlogStudioRowsFromContent(drafts.drafts),
    staleTime: 60_000,
  });

  const publishedGroups = contentQuery.data?.groups || [];
  const baseRows = useMemo(
    () => buildBlogStudioListItems(publishedGroups, drafts.drafts),
    [drafts.drafts, publishedGroups],
  );

  const filters = useBlogFilters(baseRows);

  const selectedDraft = drafts.activeDraft;
  const selectedPublishedGroup = useMemo(
    () => publishedGroups.find((group) => group.groupId === selectedGroupId) || null,
    [publishedGroups, selectedGroupId],
  );

  const activeDraft = selectedDraft || null;
  const checklist = useBlogChecklist(activeDraft);
  const preview = useBlogPreview(activeDraft, activeDraft?.previewLanguage || BLOG_DEFAULT_LANGUAGE);

  useEffect(() => {
    if (!selectedGroupId && filters.filteredItems[0]) {
      setSelectedGroupId(filters.filteredItems[0].groupId);
    }
  }, [filters.filteredItems, selectedGroupId]);

  const openGroup = async (groupId: string) => {
    setSelectedGroupId(groupId);

    const existingDraft = drafts.drafts.find((draft) => draft.groupId === groupId);
    if (existingDraft) {
      drafts.setActiveDraftId(existingDraft.draftId);
      return existingDraft;
    }

    const group = await getPublishedBlogStudioGroup(groupId);
    const draft = drafts.createDraftFromGroup(group);
    return draft;
  };

  const createDraft = (title = "") => {
    const draft = drafts.createDraft(title);
    setSelectedGroupId(draft.groupId);
    return draft;
  };

  const ensureActiveDraft = async () => {
    if (activeDraft) return activeDraft;
    if (selectedGroupId) {
      return await openGroup(selectedGroupId);
    }
    return createDraft();
  };

  const updateActiveTranslation = async (
    lang: BlogLanguage,
    patch: Partial<BlogPostRecord>,
  ) => {
    const draft = await ensureActiveDraft();
    drafts.updateTranslation(draft.draftId, lang, patch);
  };

  const updateActiveSharedFields = async (
    patch: Pick<BlogPostRecord, "featured" | "coverImage" | "tags"> & Partial<BlogPostRecord>,
  ) => {
    const draft = await ensureActiveDraft();
    drafts.updateSharedFields(draft.draftId, patch);
  };

  const publishMutation = useMutation({
    mutationFn: async (input: { draft: BlogStudioDraft; options?: BlogStudioSubmitOptions }) =>
      submitBlogStudioDraftForPublish(input.draft, input.options),
    onSuccess: async (_, input) => {
      drafts.updateDraft(input.draft.draftId, (draft) => ({
        ...draft,
        workflowStatus: "pr_open",
        updatedAt: new Date().toISOString(),
      }));
      await queryClient.invalidateQueries({ queryKey: BLOG_STUDIO_QUERY_KEY });
    },
    onError: (_, input) => {
      drafts.updateDraft(input.draft.draftId, (draft) => ({
        ...draft,
        workflowStatus: "failed",
        updatedAt: new Date().toISOString(),
      }));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (input: {
      groupId: string;
      languages: BlogLanguage[];
      options?: BlogStudioDeleteOptions;
    }) => requestBlogStudioGroupDelete(input.groupId, input.languages, input.options),
    onSuccess: async (_, input) => {
      drafts.removeDraft(input.groupId);
      await queryClient.invalidateQueries({ queryKey: BLOG_STUDIO_QUERY_KEY });
    },
  });

  const publishActiveDraft = async (options?: BlogStudioSubmitOptions) => {
    const draft = await ensureActiveDraft();
    return publishMutation.mutateAsync({ draft, options });
  };

  const deleteSelectedGroup = async (options?: BlogStudioDeleteOptions) => {
    const targetGroupId = selectedGroupId || activeDraft?.groupId;
    if (!targetGroupId) throw new Error("No blog group selected");

    const source = publishedGroups.find((group) => group.groupId === targetGroupId);
    const languages = source?.availableLanguages || [...BLOG_LANGUAGES];

    return deleteMutation.mutateAsync({
      groupId: targetGroupId,
      languages,
      options,
    });
  };

  const selectLanguage = async (lang: BlogLanguage, mode: "active" | "preview" = "active") => {
    const draft = await ensureActiveDraft();
    drafts.setLanguage(draft.draftId, lang, mode);
  };

  const createDraftFromPublishedGroup = (group: BlogPostGroup) => {
    const draft = drafts.createDraftFromGroup(group);
    setSelectedGroupId(group.groupId);
    return draft;
  };

  const duplicateActiveDraft = async () => {
    const draft = await ensureActiveDraft();
    const duplicate = drafts.duplicateDraft(draft.draftId);
    if (duplicate) {
      setSelectedGroupId(duplicate.groupId);
      return duplicate;
    }
    return null;
  };

  const discardActiveDraft = async () => {
    if (!activeDraft) return;
    drafts.removeDraft(activeDraft.draftId);
  };

  const loadPublishedGroupIntoDraft = async (groupId: string) => {
    const group = await getPublishedBlogStudioGroup(groupId);
    if (!group) return null;
    return createDraftFromPublishedGroup(group);
  };

  return {
    contentQuery,
    publishedGroups,
    rows: baseRows,
    filteredRows: filters.filteredItems as BlogStudioListItem[],
    filters,
    drafts,
    activeDraft,
    selectedGroupId,
    selectedPublishedGroup,
    setSelectedGroupId,
    checklist,
    preview,
    createDraft,
    openGroup,
    ensureActiveDraft,
    updateActiveTranslation,
    updateActiveSharedFields,
    selectLanguage,
    duplicateActiveDraft,
    discardActiveDraft,
    loadPublishedGroupIntoDraft,
    publishActiveDraft,
    deleteSelectedGroup,
    publishMutation,
    deleteMutation,
  };
};
