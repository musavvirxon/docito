import { useCallback, useMemo } from "react";
import { BLOG_LANGUAGES } from "@/config/blog";
import {
  autofillBlogSeoForAllLanguages,
  autofillBlogSeoForLanguage,
  buildBlogStudioChecklist,
  type BlogStudioDraft,
} from "@/lib/blog/studio-api";
import type { BlogLanguage } from "@/types/blog";

export const useBlogChecklist = (
  draft: BlogStudioDraft | null,
  requiredLanguages: BlogLanguage[] = [...BLOG_LANGUAGES],
) => {
  const checklist = useMemo(
    () => (draft ? buildBlogStudioChecklist(draft, requiredLanguages) : null),
    [draft, requiredLanguages],
  );

  const blockedLanguages = useMemo(
    () => (checklist ? requiredLanguages.filter((lang) => !checklist.languages[lang]?.passed) : []),
    [checklist, requiredLanguages],
  );

  const canSubmitForPublish = Boolean(checklist?.passed);

  const autofillLanguage = useCallback(
    (targetDraft: BlogStudioDraft, lang: BlogLanguage) => autofillBlogSeoForLanguage(targetDraft, lang),
    [],
  );

  const autofillAllLanguages = useCallback(
    (targetDraft: BlogStudioDraft) => autofillBlogSeoForAllLanguages(targetDraft),
    [],
  );

  return {
    checklist,
    blockedLanguages,
    canSubmitForPublish,
    autofillLanguage,
    autofillAllLanguages,
  };
};
