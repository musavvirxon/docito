import { useMemo } from "react";
import { BLOG_DEFAULT_LANGUAGE, BLOG_LANGUAGES } from "@/config/blog";
import {
  createBlogStudioPreviewPayload,
  exportBlogStudioDraftFiles,
  stringifyBlogStudioDraftExport,
  type BlogStudioDraft,
} from "@/lib/blog/studio-api";
import { estimateBlogReadingMinutes } from "@/lib/blog/doc";
import type { BlogLanguage } from "@/types/blog";

export const useBlogPreview = (
  draft: BlogStudioDraft | null,
  language: BlogLanguage | null = null,
) => {
  const previewLanguage = language || draft?.previewLanguage || BLOG_DEFAULT_LANGUAGE;

  const preview = useMemo(
    () => (draft ? createBlogStudioPreviewPayload(draft, previewLanguage) : null),
    [draft, previewLanguage],
  );

  const readingMinutes = useMemo(
    () => (preview ? estimateBlogReadingMinutes(preview.post.doc) : 0),
    [preview],
  );

  const translationAvailability = useMemo(
    () =>
      draft
        ? BLOG_LANGUAGES.map((lang) => ({
            lang,
            title: draft.translations[lang]?.title || "",
            slug: draft.translations[lang]?.slug || "",
            available: Boolean(draft.translations[lang]?.title || draft.translations[lang]?.slug),
          }))
        : [],
    [draft],
  );

  const exportFiles = useMemo(() => (draft ? exportBlogStudioDraftFiles(draft) : []), [draft]);

  const exportJson = useMemo(() => (draft ? stringifyBlogStudioDraftExport(draft) : ""), [draft]);

  return {
    previewLanguage,
    preview,
    readingMinutes,
    translationAvailability,
    exportFiles,
    exportJson,
  };
};
