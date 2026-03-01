import { BLOG_LANGUAGES } from "@/config/blog";
import { createBlogGroupChecklist, createBlogLanguageChecklist } from "@/lib/blog/checklist";
import { safeParseBlogPostRecord } from "@/lib/blog/schema";
import type {
  BlogGroupValidationResult,
  BlogLanguage,
  BlogPostRecord,
  BlogPostValidationResult,
  BlogValidationIssue,
} from "@/types/blog";

export const validateBlogPostRecord = (
  input: unknown,
  expectedLang?: BlogLanguage,
): BlogPostValidationResult => {
  const parsed = safeParseBlogPostRecord(input);

  if (!parsed.success) {
    const issues: BlogValidationIssue[] = parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
      code: issue.code,
    }));

    return {
      valid: false,
      issues,
      checklist: createBlogLanguageChecklist(expectedLang || "en"),
    };
  }

  const checklist = createBlogLanguageChecklist(parsed.data.lang, parsed.data);
  const checklistIssues: BlogValidationIssue[] = checklist.missingKeys.map((key) => ({
    path: key,
    message: `${key} is required`,
    code: "missing_required_field",
  }));

  return {
    valid: checklist.passed,
    issues: checklistIssues,
    checklist,
  };
};

export const validateBlogGroupRecords = (
  posts: Partial<Record<BlogLanguage, BlogPostRecord>>,
  requiredLanguages: BlogLanguage[] = [...BLOG_LANGUAGES],
): BlogGroupValidationResult => {
  const issues: BlogValidationIssue[] = [];

  requiredLanguages.forEach((lang) => {
    const post = posts[lang];
    if (!post) {
      issues.push({
        path: lang,
        message: `Missing translation for ${lang}`,
        code: "missing_translation",
      });
      return;
    }

    const result = validateBlogPostRecord(post, lang);
    result.issues.forEach((issue) => {
      issues.push({
        ...issue,
        path: `${lang}.${issue.path}`,
      });
    });
  });

  const checklist = createBlogGroupChecklist(posts, requiredLanguages);

  checklist.global.missingKeys.forEach((key) => {
    issues.push({
      path: `global.${key}`,
      message: `${key} is required`,
      code: "missing_global_field",
    });
  });

  return {
    valid: checklist.passed && issues.length === 0,
    issues,
    checklist,
  };
};

export const isBlogPostPublished = (post?: BlogPostRecord | null) =>
  !!post &&
  post.status === "published" &&
  !!post.publishedAt &&
  createBlogLanguageChecklist(post.lang, post).passed;
