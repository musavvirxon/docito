import type {
  BLOG_LANGUAGES,
  BLOG_POST_STATUSES,
  BLOG_REQUIRED_GLOBAL_FIELDS,
  BLOG_REQUIRED_LANGUAGE_FIELDS,
} from "@/config/blog";

export type BlogLanguage = (typeof BLOG_LANGUAGES)[number];
export type BlogPostStatus = (typeof BLOG_POST_STATUSES)[number];
export type BlogRequiredLanguageField = (typeof BLOG_REQUIRED_LANGUAGE_FIELDS)[number];
export type BlogRequiredGlobalField = (typeof BLOG_REQUIRED_GLOBAL_FIELDS)[number];

export type BlogTextAlign = "left" | "center" | "right" | "justify";

export interface BlogDocMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface BlogDocNode {
  type: string;
  attrs?: Record<string, unknown>;
  marks?: BlogDocMark[];
  text?: string;
  content?: BlogDocNode[];
}

export interface BlogDoc {
  type: "doc";
  content: BlogDocNode[];
}

export interface BlogPostSeo {
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  ogImage: string;
}

export interface BlogPostRecord {
  groupId: string;
  lang: BlogLanguage;
  slug: string;
  status: BlogPostStatus;
  featured: boolean;
  coverImage: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  title: string;
  excerpt: string;
  seo: BlogPostSeo;
  doc: BlogDoc;
}

export interface BlogTranslationLink {
  lang: BlogLanguage;
  slug: string;
  href: string;
  title: string;
}

export interface BlogPostGroup {
  groupId: string;
  featured: boolean;
  coverImage: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  availableLanguages: BlogLanguage[];
  translations: Partial<Record<BlogLanguage, BlogPostRecord>>;
}

export interface BlogManifestItem {
  groupId: string;
  lang: BlogLanguage;
  slug: string;
  href: string;
  title: string;
  excerpt: string;
  featured: boolean;
  tags: string[];
  coverImage: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  availableLanguages: BlogLanguage[];
}

export interface BlogChecklistItem {
  key: BlogRequiredLanguageField | BlogRequiredGlobalField;
  label: string;
  passed: boolean;
}

export interface BlogLanguageChecklist {
  lang: BlogLanguage;
  items: BlogChecklistItem[];
  passed: boolean;
  missingKeys: Array<BlogRequiredLanguageField>;
}

export interface BlogGlobalChecklist {
  items: BlogChecklistItem[];
  passed: boolean;
  missingKeys: Array<BlogRequiredGlobalField>;
}

export interface BlogGroupChecklistResult {
  requiredLanguages: BlogLanguage[];
  languages: Record<BlogLanguage, BlogLanguageChecklist>;
  global: BlogGlobalChecklist;
  passed: boolean;
  publishableLanguages: BlogLanguage[];
}

export interface BlogValidationIssue {
  path: string;
  message: string;
  code?: string;
}

export interface BlogPostValidationResult {
  valid: boolean;
  issues: BlogValidationIssue[];
  checklist: BlogLanguageChecklist;
}

export interface BlogGroupValidationResult {
  valid: boolean;
  issues: BlogValidationIssue[];
  checklist: BlogGroupChecklistResult;
}

export interface BlogSeoInput {
  siteUrl?: string;
  lang: BlogLanguage;
  slug: string;
  title: string;
  description: string;
  image?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  tags?: string[];
  authorName?: string;
}

export interface BlogArticleStructuredData {
  "@context": "https://schema.org";
  "@type": "Article";
  headline: string;
  description: string;
  inLanguage: string;
  mainEntityOfPage: string;
  image?: string[];
  datePublished?: string;
  dateModified?: string;
  author: {
    "@type": "Organization";
    name: string;
  };
  publisher: {
    "@type": "Organization";
    name: string;
    logo?: {
      "@type": "ImageObject";
      url: string;
    };
  };
  keywords?: string;
}
