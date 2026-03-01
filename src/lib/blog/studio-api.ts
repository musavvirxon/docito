import { supabase } from "@/integrations/supabase/client";
import { BLOG_DEFAULT_LANGUAGE, BLOG_LANGUAGES, type BlogLanguage } from "@/config/blog";
import { createBlogGroupChecklist } from "@/lib/blog/checklist";
import { createEmptyBlogPostRecord } from "@/lib/blog/defaults";
import { buildBlogManifest, buildBlogGroups } from "@/lib/blog/manifest";
import {
  getAllBlogPosts,
  getBlogGroupTranslations,
  getBlogGroupsForAdmin,
  getPublishedBlogPosts,
} from "@/lib/blog/public-loader";
import { createBlogArticleStructuredData, getBlogCanonicalUrl } from "@/lib/blog/seo";
import { createUniqueBlogSlug, normalizeGroupId, normalizeSlug } from "@/lib/blog/slug";
import { validateBlogGroupRecords } from "@/lib/blog/validation";
import type {
  BlogGroupChecklistResult,
  BlogLanguageChecklist,
  BlogManifestItem,
  BlogPostGroup,
  BlogPostRecord,
} from "@/types/blog";

export type BlogStudioWorkflowStatus =
  | "draft"
  | "ready_for_review"
  | "pr_open"
  | "merged"
  | "published"
  | "failed";

export interface BlogStudioDraft {
  draftId: string;
  groupId: string;
  sourceGroupId: string | null;
  activeLanguage: BlogLanguage;
  previewLanguage: BlogLanguage;
  workflowStatus: BlogStudioWorkflowStatus;
  createdAt: string;
  updatedAt: string;
  translations: Record<BlogLanguage, BlogPostRecord>;
}

export interface BlogStudioListItem {
  groupId: string;
  featured: boolean;
  coverImage: string;
  tags: string[];
  availableLanguages: BlogLanguage[];
  updatedAt: string;
  publishedAt: string | null;
  statuses: string[];
  titles: Partial<Record<BlogLanguage, string>>;
  slugs: Partial<Record<BlogLanguage, string>>;
  hasLocalDraft: boolean;
  draftId: string | null;
  source: "published" | "draft" | "mixed";
}

export interface BlogStudioAssetUploadInput {
  filename: string;
  file: File;
}

export interface BlogStudioSubmitOptions {
  assetFiles?: BlogStudioAssetUploadInput[];
  deleteAssetFilenames?: string[];
  title?: string;
  body?: string;
  draft?: boolean;
  commitMessage?: string;
  baseBranch?: string;
}

export interface BlogStudioDeleteOptions {
  assetFilenames?: string[];
  title?: string;
  body?: string;
  draft?: boolean;
  commitMessage?: string;
  baseBranch?: string;
}

export interface BlogStudioSubmitResult {
  ok: boolean;
  action: "submit_for_publish";
  groupId: string;
  branch: string;
  baseBranch: string;
  changedPaths: string[];
  deletedPaths: string[];
  commitSha: string | null;
  pullRequest: {
    number: number;
    url: string;
    state: string;
  };
}

export interface BlogStudioDeleteResult {
  ok: boolean;
  action: "delete_post_group";
  groupId: string;
  branch: string;
  baseBranch: string;
  changedPaths: string[];
  deletedPaths: string[];
  commitSha: string | null;
  pullRequest: {
    number: number;
    url: string;
    state: string;
  };
}

const nowIso = () => new Date().toISOString();

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const readFileAsBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };

    reader.readAsDataURL(file);
  });

const getDefaultWorkflowStatus = (group: BlogPostGroup | null) =>
  group?.publishedAt ? ("published" as const) : ("draft" as const);

const buildTitleMap = (translations: Partial<Record<BlogLanguage, BlogPostRecord>>) =>
  Object.fromEntries(
    BLOG_LANGUAGES.filter((lang) => !!translations[lang]).map((lang) => [lang, translations[lang]!.title]),
  ) as Partial<Record<BlogLanguage, string>>;

const buildSlugMap = (translations: Partial<Record<BlogLanguage, BlogPostRecord>>) =>
  Object.fromEntries(
    BLOG_LANGUAGES.filter((lang) => !!translations[lang]).map((lang) => [lang, translations[lang]!.slug]),
  ) as Partial<Record<BlogLanguage, string>>;

export const createBlogStudioDraftFromGroup = (group?: BlogPostGroup | null): BlogStudioDraft => {
  const seedGroupId = normalizeGroupId(group?.groupId || `blog-post-${Date.now()}`);
  const createdAt = group?.createdAt || nowIso();
  const updatedAt = nowIso();

  const translations = BLOG_LANGUAGES.reduce((acc, lang) => {
    const source = group?.translations?.[lang];
    acc[lang] = source
      ? clone(source)
      : createEmptyBlogPostRecord(lang, {
          groupId: seedGroupId,
          slug: seedGroupId,
          createdAt,
          updatedAt,
          coverImage: group?.coverImage || "",
          featured: group?.featured || false,
          tags: group?.tags || [],
        });
    return acc;
  }, {} as Record<BlogLanguage, BlogPostRecord>);

  return {
    draftId: seedGroupId,
    groupId: seedGroupId,
    sourceGroupId: group?.groupId || null,
    activeLanguage: BLOG_DEFAULT_LANGUAGE,
    previewLanguage: BLOG_DEFAULT_LANGUAGE,
    workflowStatus: getDefaultWorkflowStatus(group || null),
    createdAt,
    updatedAt,
    translations,
  };
};

export const createEmptyBlogStudioDraft = (title = "") => {
  const groupId = normalizeGroupId(title || `blog-post-${Date.now()}`);
  return createBlogStudioDraftFromGroup({
    groupId,
    availableLanguages: [BLOG_DEFAULT_LANGUAGE],
    coverImage: "",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    featured: false,
    publishedAt: null,
    tags: [],
    translations: {
      [BLOG_DEFAULT_LANGUAGE]: createEmptyBlogPostRecord(BLOG_DEFAULT_LANGUAGE, {
        groupId,
        title: title.trim(),
        slug: normalizeSlug(title || groupId),
      }),
    },
  } as BlogPostGroup);
};

export const createBlogStudioDuplicateDraft = (
  draft: BlogStudioDraft,
  existingGroupIds: string[] = [],
): BlogStudioDraft => {
  const duplicateGroupId = createUniqueBlogSlug(`${draft.groupId}-copy`, existingGroupIds);
  const duplicated = clone(draft);

  duplicated.draftId = duplicateGroupId;
  duplicated.groupId = duplicateGroupId;
  duplicated.sourceGroupId = null;
  duplicated.createdAt = nowIso();
  duplicated.updatedAt = duplicated.createdAt;
  duplicated.workflowStatus = "draft";

  BLOG_LANGUAGES.forEach((lang) => {
    duplicated.translations[lang] = {
      ...duplicated.translations[lang],
      groupId: duplicateGroupId,
      slug: createUniqueBlogSlug(duplicated.translations[lang].title || duplicateGroupId, []),
      createdAt: duplicated.createdAt,
      updatedAt: duplicated.updatedAt,
      publishedAt: null,
      status: "draft",
      featured: duplicated.translations[lang].featured,
      coverImage: duplicated.translations[lang].coverImage,
      tags: [...duplicated.translations[lang].tags],
    };
  });

  return duplicated;
};

export const setBlogDraftLanguage = (
  draft: BlogStudioDraft,
  lang: BlogLanguage,
  mode: "active" | "preview" = "active",
): BlogStudioDraft => ({
  ...draft,
  activeLanguage: mode === "active" ? lang : draft.activeLanguage,
  previewLanguage: mode === "preview" ? lang : draft.previewLanguage,
});

export const updateBlogDraftTranslation = (
  draft: BlogStudioDraft,
  lang: BlogLanguage,
  patch: Partial<BlogPostRecord>,
): BlogStudioDraft => {
  const updatedAt = nowIso();
  const previous = draft.translations[lang];
  const nextTitle = patch.title !== undefined ? patch.title : previous.title;
  const nextGroupId = normalizeGroupId(patch.groupId || draft.groupId);

  const nextTranslation: BlogPostRecord = {
    ...previous,
    ...patch,
    groupId: nextGroupId,
    lang,
    slug:
      patch.slug !== undefined
        ? normalizeSlug(patch.slug)
        : previous.slug || normalizeSlug(nextTitle || nextGroupId),
    updatedAt,
  };

  const translations = {
    ...draft.translations,
    [lang]: nextTranslation,
  };

  return {
    ...draft,
    groupId: nextGroupId,
    updatedAt,
    translations,
  };
};

export const updateBlogDraftSharedFields = (
  draft: BlogStudioDraft,
  patch: Pick<BlogPostRecord, "featured" | "coverImage" | "tags"> & Partial<BlogPostRecord>,
): BlogStudioDraft => {
  const updatedAt = nowIso();
  const nextGroupId = normalizeGroupId(patch.groupId || draft.groupId);

  const translations = BLOG_LANGUAGES.reduce((acc, lang) => {
    const current = draft.translations[lang];
    acc[lang] = {
      ...current,
      groupId: nextGroupId,
      featured: typeof patch.featured === "boolean" ? patch.featured : current.featured,
      coverImage: patch.coverImage !== undefined ? patch.coverImage : current.coverImage,
      tags: Array.isArray(patch.tags) ? [...patch.tags] : current.tags,
      updatedAt,
    };
    return acc;
  }, {} as Record<BlogLanguage, BlogPostRecord>);

  return {
    ...draft,
    groupId: nextGroupId,
    updatedAt,
    translations,
  };
};

export const autofillBlogSeoForLanguage = (
  draft: BlogStudioDraft,
  lang: BlogLanguage,
): BlogStudioDraft => {
  const current = draft.translations[lang];

  return updateBlogDraftTranslation(draft, lang, {
    seo: {
      ...current.seo,
      metaTitle: current.seo.metaTitle?.trim() || current.title.trim(),
      metaDescription: current.seo.metaDescription?.trim() || current.excerpt.trim(),
      keywords:
        current.seo.keywords?.length > 0
          ? current.seo.keywords
          : current.tags.length > 0
            ? [...current.tags]
            : [...current.seo.keywords],
      ogImage: current.seo.ogImage?.trim() || current.coverImage.trim(),
    },
  });
};

export const autofillBlogSeoForAllLanguages = (draft: BlogStudioDraft) =>
  BLOG_LANGUAGES.reduce(
    (acc, lang) => autofillBlogSeoForLanguage(acc, lang),
    draft,
  );

export const buildBlogStudioChecklist = (
  draft: BlogStudioDraft,
  requiredLanguages: BlogLanguage[] = [...BLOG_LANGUAGES],
): BlogGroupChecklistResult =>
  createBlogGroupChecklist(draft.translations, requiredLanguages);

export const validateBlogStudioDraft = (
  draft: BlogStudioDraft,
  requiredLanguages: BlogLanguage[] = [...BLOG_LANGUAGES],
) => validateBlogGroupRecords(draft.translations, requiredLanguages);

export const exportBlogStudioDraftFiles = (draft: BlogStudioDraft) =>
  BLOG_LANGUAGES.map((lang) => ({
    lang,
    path: `src/content/blog/posts/${draft.groupId}/${lang}.json`,
    content: clone(draft.translations[lang]),
    json: `${JSON.stringify(draft.translations[lang], null, 2)}\n`,
  }));

export const stringifyBlogStudioDraftExport = (draft: BlogStudioDraft) =>
  JSON.stringify(
    {
      draftId: draft.draftId,
      groupId: draft.groupId,
      sourceGroupId: draft.sourceGroupId,
      activeLanguage: draft.activeLanguage,
      previewLanguage: draft.previewLanguage,
      workflowStatus: draft.workflowStatus,
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
      files: exportBlogStudioDraftFiles(draft).map(({ lang, path, content }) => ({
        lang,
        path,
        content,
      })),
    },
    null,
    2,
  );

export const createBlogStudioPreviewPayload = (
  draft: BlogStudioDraft,
  lang: BlogLanguage = draft.previewLanguage,
) => {
  const post = draft.translations[lang];
  const translations = BLOG_LANGUAGES.filter((language) => !!draft.translations[language]?.slug).map((language) => {
    const translation = draft.translations[language];
    return {
      lang: language,
      slug: translation.slug,
      title: translation.title,
      href: getBlogCanonicalUrl(language, translation.slug),
    };
  });

  return {
    post,
    translations,
    seoStructuredData: createBlogArticleStructuredData({
      lang,
      slug: post.slug,
      title: post.seo.metaTitle || post.title,
      description: post.seo.metaDescription || post.excerpt,
      image: post.seo.ogImage || post.coverImage,
      publishedAt: post.publishedAt,
      updatedAt: post.updatedAt,
      tags: post.seo.keywords?.length ? post.seo.keywords : post.tags,
    }),
  };
};

export const buildBlogStudioListItems = (
  publishedGroups: BlogPostGroup[],
  drafts: BlogStudioDraft[],
): BlogStudioListItem[] => {
  const draftMap = new Map(drafts.map((draft) => [draft.groupId, draft]));
  const publishedMap = new Map(publishedGroups.map((group) => [group.groupId, group]));
  const ids = Array.from(new Set([...publishedMap.keys(), ...draftMap.keys()]));

  return ids
    .map((groupId) => {
      const group = publishedMap.get(groupId) || null;
      const draft = draftMap.get(groupId) || null;
      const translations = draft?.translations || group?.translations || {};
      const availableLanguages = BLOG_LANGUAGES.filter((lang) => !!translations[lang]);
      const anyTranslation = availableLanguages.map((lang) => translations[lang]!).find(Boolean);

      return {
        groupId,
        featured: Boolean(
          draft
            ? BLOG_LANGUAGES.some((lang) => draft.translations[lang].featured)
            : group?.featured,
        ),
        coverImage: anyTranslation?.coverImage || group?.coverImage || "",
        tags: anyTranslation?.tags || group?.tags || [],
        availableLanguages,
        updatedAt: draft?.updatedAt || group?.updatedAt || "",
        publishedAt: group?.publishedAt || null,
        statuses: availableLanguages.map((lang) => translations[lang]!.status),
        titles: buildTitleMap(translations),
        slugs: buildSlugMap(translations),
        hasLocalDraft: !!draft,
        draftId: draft?.draftId || null,
        source:
          draft && group ? "mixed" : draft ? "draft" : "published",
      };
    })
    .sort((a, b) => {
      if (a.featured !== b.featured) return Number(b.featured) - Number(a.featured);
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
};

export const listPublishedBlogStudioGroups = async () => getBlogGroupsForAdmin();

export const listPublishedBlogStudioManifest = async () => buildBlogManifest(getPublishedBlogPosts());

export const listPublishedBlogStudioPosts = async () => getAllBlogPosts();

export const getPublishedBlogStudioGroup = async (groupId: string) =>
  getBlogGroupsForAdmin().find((group) => group.groupId === groupId) || null;

export const getPublishedBlogStudioTranslations = async (groupId: string) =>
  getBlogGroupTranslations(groupId);

export const generateBlogStudioGroupId = (
  seed: string,
  existingGroupIds: string[] = [],
) => createUniqueBlogSlug(seed || `blog-post-${Date.now()}`, existingGroupIds);

export const submitBlogStudioDraftForPublish = async (
  draft: BlogStudioDraft,
  options: BlogStudioSubmitOptions = {},
): Promise<BlogStudioSubmitResult> => {
  const validation = validateBlogStudioDraft(draft);
  if (!validation.valid) {
    throw new Error("Draft is not publishable. Resolve the checklist before submitting for publish.");
  }

  const assetFiles = await Promise.all(
    (options.assetFiles || []).map(async (asset) => ({
      filename: asset.filename,
      contentBase64: await readFileAsBase64(asset.file),
    })),
  );

  const postFiles = BLOG_LANGUAGES.map((lang) => ({
    lang,
    content: draft.translations[lang],
  }));

  const { data, error } = await supabase.functions.invoke("blog-studio", {
    body: {
      action: "submit_for_publish",
      groupId: draft.groupId,
      postFiles,
      assetFiles,
      deleteAssetFilenames: options.deleteAssetFilenames || [],
      pr: {
        title: options.title,
        body: options.body,
        draft: options.draft,
      },
      commit: {
        message: options.commitMessage,
      },
      baseBranch: options.baseBranch,
    },
  });

  if (error) {
    throw new Error(error.message || "Failed to submit blog publish request");
  }

  if (!data?.ok) {
    throw new Error(data?.error || "Blog publish request failed");
  }

  return data as BlogStudioSubmitResult;
};

export const requestBlogStudioGroupDelete = async (
  groupId: string,
  languages: BlogLanguage[],
  options: BlogStudioDeleteOptions = {},
): Promise<BlogStudioDeleteResult> => {
  const { data, error } = await supabase.functions.invoke("blog-studio", {
    body: {
      action: "delete_post_group",
      groupId,
      languages,
      assetFilenames: options.assetFilenames || [],
      pr: {
        title: options.title,
        body: options.body,
        draft: options.draft,
      },
      commit: {
        message: options.commitMessage,
      },
      baseBranch: options.baseBranch,
    },
  });

  if (error) {
    throw new Error(error.message || "Failed to submit blog delete request");
  }

  if (!data?.ok) {
    throw new Error(data?.error || "Blog delete request failed");
  }

  return data as BlogStudioDeleteResult;
};

export const hydrateBlogStudioRowsFromContent = async (drafts: BlogStudioDraft[] = []) => {
  const groups = await listPublishedBlogStudioGroups();
  const manifest = await listPublishedBlogStudioManifest();

  return {
    groups,
    manifest,
    rows: buildBlogStudioListItems(groups, drafts),
  };
};

export const getPublishedBlogStudioSnapshot = async () => {
  const posts = await listPublishedBlogStudioPosts();
  return {
    posts,
    groups: buildBlogGroups(posts),
    manifest: buildBlogManifest(posts),
  };
};

export const getBlogStudioInitialDraftForGroup = async (groupId: string) => {
  const group = await getPublishedBlogStudioGroup(groupId);
  return createBlogStudioDraftFromGroup(group);
};

export const getBlogStudioChecklistForGroup = async (groupId: string) => {
  const draft = await getBlogStudioInitialDraftForGroup(groupId);
  return buildBlogStudioChecklist(draft);
};

export const getBlogStudioLanguageChecklist = async (
  groupId: string,
  lang: BlogLanguage,
): Promise<BlogLanguageChecklist> => {
  const draft = await getBlogStudioInitialDraftForGroup(groupId);
  return buildBlogStudioChecklist(draft).languages[lang];
};

export const getBlogStudioManifestMap = async () => {
  const manifest = await listPublishedBlogStudioManifest();
  return manifest.reduce<Record<string, BlogManifestItem[]>>((acc, item) => {
    if (!acc[item.groupId]) acc[item.groupId] = [];
    acc[item.groupId].push(item);
    return acc;
  }, {});
};
