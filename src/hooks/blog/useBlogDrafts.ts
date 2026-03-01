import { useCallback, useEffect, useMemo, useState } from "react";
import { BLOG_DEFAULT_LANGUAGE, BLOG_LANGUAGES } from "@/config/blog";
import {
  autofillBlogSeoForAllLanguages,
  createBlogStudioDraftFromGroup,
  createBlogStudioDuplicateDraft,
  createEmptyBlogStudioDraft,
  setBlogDraftLanguage,
  updateBlogDraftSharedFields,
  updateBlogDraftTranslation,
  type BlogStudioDraft,
} from "@/lib/blog/studio-api";
import type { BlogLanguage, BlogPostGroup, BlogPostRecord } from "@/types/blog";

const BLOG_DRAFTS_STORAGE_KEY = "docito.blogStudio.drafts.v1";
const BLOG_ACTIVE_DRAFT_STORAGE_KEY = "docito.blogStudio.activeDraftId.v1";

const canUseStorage = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const readStorage = <T,>(key: string, fallback: T): T => {
  if (!canUseStorage()) return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const writeStorage = (key: string, value: unknown) => {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage quota errors
  }
};

const normalizeLoadedDraft = (input: BlogStudioDraft): BlogStudioDraft => {
  const fallback = createEmptyBlogStudioDraft(input.groupId || "blog-post");
  const translations = BLOG_LANGUAGES.reduce((acc, lang) => {
    acc[lang] = input.translations?.[lang] || fallback.translations[lang];
    return acc;
  }, {} as Record<BlogLanguage, BlogPostRecord>);

  return {
    ...fallback,
    ...input,
    activeLanguage: input.activeLanguage || BLOG_DEFAULT_LANGUAGE,
    previewLanguage: input.previewLanguage || input.activeLanguage || BLOG_DEFAULT_LANGUAGE,
    translations,
  };
};

export const useBlogDrafts = () => {
  const [draftMap, setDraftMap] = useState<Record<string, BlogStudioDraft>>(() => {
    const stored = readStorage<Record<string, BlogStudioDraft>>(BLOG_DRAFTS_STORAGE_KEY, {});
    return Object.fromEntries(
      Object.entries(stored).map(([key, draft]) => [key, normalizeLoadedDraft(draft)]),
    );
  });

  const [activeDraftId, setActiveDraftIdState] = useState<string | null>(() =>
    readStorage<string | null>(BLOG_ACTIVE_DRAFT_STORAGE_KEY, null),
  );

  useEffect(() => {
    writeStorage(BLOG_DRAFTS_STORAGE_KEY, draftMap);
  }, [draftMap]);

  useEffect(() => {
    writeStorage(BLOG_ACTIVE_DRAFT_STORAGE_KEY, activeDraftId);
  }, [activeDraftId]);

  const drafts = useMemo(
    () =>
      Object.values(draftMap).sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      ),
    [draftMap],
  );

  const activeDraft = useMemo(
    () => (activeDraftId ? draftMap[activeDraftId] || null : null),
    [activeDraftId, draftMap],
  );

  const setActiveDraftId = useCallback((draftId: string | null) => {
    setActiveDraftIdState(draftId);
  }, []);

  const upsertDraft = useCallback((draft: BlogStudioDraft) => {
    const normalized = normalizeLoadedDraft(draft);
    setDraftMap((current) => ({
      ...current,
      [normalized.draftId]: normalized,
    }));
    setActiveDraftIdState(normalized.draftId);
    return normalized;
  }, []);

  const createDraft = useCallback((title = "") => {
    const draft = createEmptyBlogStudioDraft(title);
    setDraftMap((current) => ({
      ...current,
      [draft.draftId]: draft,
    }));
    setActiveDraftIdState(draft.draftId);
    return draft;
  }, []);

  const createDraftFromGroup = useCallback((group?: BlogPostGroup | null) => {
    const draft = createBlogStudioDraftFromGroup(group || null);
    setDraftMap((current) => ({
      ...current,
      [draft.draftId]: draft,
    }));
    setActiveDraftIdState(draft.draftId);
    return draft;
  }, []);

  const duplicateDraft = useCallback(
    (draftId: string) => {
      const source = draftMap[draftId];
      if (!source) return null;

      const duplicate = createBlogStudioDuplicateDraft(source, Object.keys(draftMap));
      setDraftMap((current) => ({
        ...current,
        [duplicate.draftId]: duplicate,
      }));
      setActiveDraftIdState(duplicate.draftId);
      return duplicate;
    },
    [draftMap],
  );

  const removeDraft = useCallback((draftId: string) => {
    setDraftMap((current) => {
      const next = { ...current };
      delete next[draftId];
      return next;
    });

    setActiveDraftIdState((current) => (current === draftId ? null : current));
  }, []);

  const replaceDraft = useCallback((draftId: string, nextDraft: BlogStudioDraft) => {
    setDraftMap((current) => {
      const next = { ...current };
      delete next[draftId];
      next[nextDraft.draftId] = normalizeLoadedDraft(nextDraft);
      return next;
    });

    setActiveDraftIdState(nextDraft.draftId);
    return nextDraft;
  }, []);

  const updateDraft = useCallback(
    (draftId: string, updater: (draft: BlogStudioDraft) => BlogStudioDraft) => {
      let updated: BlogStudioDraft | null = null;

      setDraftMap((current) => {
        const draft = current[draftId];
        if (!draft) return current;

        updated = normalizeLoadedDraft(updater(draft));
        return {
          ...current,
          [updated.draftId]: updated,
        };
      });

      if (updated?.draftId && updated.draftId !== draftId) {
        setActiveDraftIdState(updated.draftId);
      }

      return updated;
    },
    [],
  );

  const updateTranslation = useCallback(
    (draftId: string, lang: BlogLanguage, patch: Partial<BlogPostRecord>) =>
      updateDraft(draftId, (draft) => updateBlogDraftTranslation(draft, lang, patch)),
    [updateDraft],
  );

  const updateSharedFields = useCallback(
    (
      draftId: string,
      patch: Pick<BlogPostRecord, "featured" | "coverImage" | "tags"> & Partial<BlogPostRecord>,
    ) => updateDraft(draftId, (draft) => updateBlogDraftSharedFields(draft, patch)),
    [updateDraft],
  );

  const setLanguage = useCallback(
    (draftId: string, lang: BlogLanguage, mode: "active" | "preview" = "active") =>
      updateDraft(draftId, (draft) => setBlogDraftLanguage(draft, lang, mode)),
    [updateDraft],
  );

  const autofillSeo = useCallback(
    (draftId: string) => updateDraft(draftId, (draft) => autofillBlogSeoForAllLanguages(draft)),
    [updateDraft],
  );

  const clearAllDrafts = useCallback(() => {
    setDraftMap({});
    setActiveDraftIdState(null);
  }, []);

  return {
    draftMap,
    drafts,
    activeDraftId,
    activeDraft,
    setActiveDraftId,
    upsertDraft,
    replaceDraft,
    createDraft,
    createDraftFromGroup,
    duplicateDraft,
    removeDraft,
    updateDraft,
    updateTranslation,
    updateSharedFields,
    setLanguage,
    autofillSeo,
    clearAllDrafts,
  };
};
