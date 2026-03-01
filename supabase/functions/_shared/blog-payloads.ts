import { BLOG_LANGUAGES } from "../../../src/config/blog.ts";

export type BlogStudioAction = "submit_for_publish" | "delete_post_group";

export interface BlogStudioPullRequestInput {
  title?: string;
  body?: string;
  draft?: boolean;
}

export interface BlogStudioCommitInput {
  message?: string;
}

export interface BlogStudioPostFileInput {
  lang: string;
  content: Record<string, unknown>;
}

export interface BlogStudioAssetFileInput {
  filename: string;
  contentBase64: string;
}

export interface SubmitForPublishPayload {
  action: "submit_for_publish";
  groupId: string;
  postFiles: BlogStudioPostFileInput[];
  assetFiles?: BlogStudioAssetFileInput[];
  deleteAssetFilenames?: string[];
  pr?: BlogStudioPullRequestInput;
  commit?: BlogStudioCommitInput;
  baseBranch?: string;
}

export interface DeletePostGroupPayload {
  action: "delete_post_group";
  groupId: string;
  languages: string[];
  assetFilenames?: string[];
  pr?: BlogStudioPullRequestInput;
  commit?: BlogStudioCommitInput;
  baseBranch?: string;
}

export type BlogStudioPayload = SubmitForPublishPayload | DeletePostGroupPayload;

const BLOG_LANGUAGE_SET = new Set<string>(BLOG_LANGUAGES);

const MAX_POST_FILES = BLOG_LANGUAGES.length;
const MAX_ASSET_FILES = 50;
const MAX_BASE64_SIZE = 12 * 1024 * 1024;
const MAX_FILENAME_LENGTH = 200;
const MAX_GROUP_ID_LENGTH = 120;
const MAX_BRANCH_LENGTH = 100;

const normalizeString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const uniqueStrings = (values: string[]) =>
  Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

export const normalizeGroupId = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s-]/g, " ")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, MAX_GROUP_ID_LENGTH);

export const normalizeGitRefName = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9/_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/\/+/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .slice(0, MAX_BRANCH_LENGTH);

export const normalizeFilename = (value: string) => {
  const cleaned = value
    .trim()
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean)
    .pop() || "";

  return cleaned
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_FILENAME_LENGTH);
};

export const isSupportedBlogLanguage = (value: string) => BLOG_LANGUAGE_SET.has(value);

export const buildBlogPostRepoPath = (groupId: string, lang: string) =>
  `src/content/blog/posts/${normalizeGroupId(groupId)}/${lang}.json`;

export const buildBlogAssetRepoPath = (groupId: string, filename: string) =>
  `public/blog/${normalizeGroupId(groupId)}/${normalizeFilename(filename)}`;

const assertBase64 = (value: string, field: string) => {
  if (!value) {
    throw new Error(`${field} is required`);
  }

  if (value.length > MAX_BASE64_SIZE) {
    throw new Error(`${field} exceeds maximum allowed size`);
  }

  const base64Pattern = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
  if (!base64Pattern.test(value)) {
    throw new Error(`${field} must be valid base64`);
  }
};

const assertLanguage = (value: string, field = "lang") => {
  if (!isSupportedBlogLanguage(value)) {
    throw new Error(`${field} must be one of: ${BLOG_LANGUAGES.join(", ")}`);
  }
};

const assertGroupId = (value: string) => {
  const normalized = normalizeGroupId(value);
  if (!normalized) {
    throw new Error("groupId is required");
  }
  return normalized;
};

const assertFilename = (value: string, field = "filename") => {
  const normalized = normalizeFilename(value);
  if (!normalized) {
    throw new Error(`${field} is required`);
  }
  return normalized;
};

const parsePostFiles = (value: unknown, groupId: string): BlogStudioPostFileInput[] => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("postFiles must be a non-empty array");
  }

  if (value.length > MAX_POST_FILES) {
    throw new Error(`postFiles may not exceed ${MAX_POST_FILES} entries`);
  }

  const parsed = value.map((entry, index) => {
    if (!isPlainObject(entry)) {
      throw new Error(`postFiles[${index}] must be an object`);
    }

    const lang = normalizeString(entry.lang);
    assertLanguage(lang, `postFiles[${index}].lang`);

    if (!isPlainObject(entry.content)) {
      throw new Error(`postFiles[${index}].content must be an object`);
    }

    const content = {
      ...entry.content,
      groupId,
      lang,
    };

    return {
      lang,
      content,
    };
  });

  const uniqueLanguages = uniqueStrings(parsed.map((item) => item.lang));
  if (uniqueLanguages.length !== parsed.length) {
    throw new Error("postFiles contains duplicate languages");
  }

  return parsed;
};

const parseAssetFiles = (value: unknown): BlogStudioAssetFileInput[] => {
  if (value == null) return [];
  if (!Array.isArray(value)) {
    throw new Error("assetFiles must be an array");
  }
  if (value.length > MAX_ASSET_FILES) {
    throw new Error(`assetFiles may not exceed ${MAX_ASSET_FILES} entries`);
  }

  const parsed = value.map((entry, index) => {
    if (!isPlainObject(entry)) {
      throw new Error(`assetFiles[${index}] must be an object`);
    }

    const filename = assertFilename(normalizeString(entry.filename), `assetFiles[${index}].filename`);
    const contentBase64 = normalizeString(entry.contentBase64);
    assertBase64(contentBase64, `assetFiles[${index}].contentBase64`);

    return {
      filename,
      contentBase64,
    };
  });

  const uniqueFilenames = uniqueStrings(parsed.map((item) => item.filename));
  if (uniqueFilenames.length !== parsed.length) {
    throw new Error("assetFiles contains duplicate filenames");
  }

  return parsed;
};

const parseDeleteAssetFilenames = (value: unknown, field = "deleteAssetFilenames") => {
  if (value == null) return [] as string[];
  if (!Array.isArray(value)) {
    throw new Error(`${field} must be an array`);
  }

  return uniqueStrings(
    value.map((item, index) => assertFilename(normalizeString(item), `${field}[${index}]`)),
  );
};

const parseLanguages = (value: unknown) => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("languages must be a non-empty array");
  }

  const parsed = uniqueStrings(
    value.map((item, index) => {
      const lang = normalizeString(item);
      assertLanguage(lang, `languages[${index}]`);
      return lang;
    }),
  );

  if (parsed.length === 0) {
    throw new Error("languages must contain at least one valid language");
  }

  return parsed;
};

const parsePullRequest = (value: unknown, groupId: string, action: BlogStudioAction): BlogStudioPullRequestInput => {
  if (value == null) {
    return {
      title:
        action === "submit_for_publish"
          ? `blog: submit ${groupId} for publish`
          : `blog: delete ${groupId}`,
      body:
        action === "submit_for_publish"
          ? `Automated Blog Studio publish request for \`${groupId}\`.`
          : `Automated Blog Studio delete request for \`${groupId}\`.`,
      draft: false,
    };
  }

  if (!isPlainObject(value)) {
    throw new Error("pr must be an object");
  }

  const title = normalizeString(value.title);
  const body = normalizeString(value.body);
  const draft = Boolean(value.draft);

  return {
    title:
      title ||
      (action === "submit_for_publish"
        ? `blog: submit ${groupId} for publish`
        : `blog: delete ${groupId}`),
    body:
      body ||
      (action === "submit_for_publish"
        ? `Automated Blog Studio publish request for \`${groupId}\`.`
        : `Automated Blog Studio delete request for \`${groupId}\`.`),
    draft,
  };
};

const parseCommit = (value: unknown, groupId: string, action: BlogStudioAction): BlogStudioCommitInput => {
  if (value == null) {
    return {
      message:
        action === "submit_for_publish"
          ? `blog: update ${groupId}`
          : `blog: delete ${groupId}`,
    };
  }

  if (!isPlainObject(value)) {
    throw new Error("commit must be an object");
  }

  const message = normalizeString(value.message);
  return {
    message:
      message ||
      (action === "submit_for_publish"
        ? `blog: update ${groupId}`
        : `blog: delete ${groupId}`),
  };
};

const parseBaseBranch = (value: unknown) => {
  const normalized = normalizeGitRefName(normalizeString(value));
  return normalized || undefined;
};

export const parseBlogStudioPayload = (input: unknown): BlogStudioPayload => {
  if (!isPlainObject(input)) {
    throw new Error("Request body must be an object");
  }

  const action = normalizeString(input.action) as BlogStudioAction;
  if (action !== "submit_for_publish" && action !== "delete_post_group") {
    throw new Error("action must be submit_for_publish or delete_post_group");
  }

  const groupId = assertGroupId(normalizeString(input.groupId));

  if (action === "submit_for_publish") {
    return {
      action,
      groupId,
      postFiles: parsePostFiles(input.postFiles, groupId),
      assetFiles: parseAssetFiles(input.assetFiles),
      deleteAssetFilenames: parseDeleteAssetFilenames(input.deleteAssetFilenames),
      pr: parsePullRequest(input.pr, groupId, action),
      commit: parseCommit(input.commit, groupId, action),
      baseBranch: parseBaseBranch(input.baseBranch),
    };
  }

  return {
    action,
    groupId,
    languages: parseLanguages(input.languages),
    assetFilenames: parseDeleteAssetFilenames(input.assetFilenames, "assetFilenames"),
    pr: parsePullRequest(input.pr, groupId, action),
    commit: parseCommit(input.commit, groupId, action),
    baseBranch: parseBaseBranch(input.baseBranch),
  };
};
