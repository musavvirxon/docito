export const BLOG_LANGUAGES = [
  "en",
  "ru",
  "uz",
  "ar",
  "tr",
  "es",
  "de",
  "zh",
  "pt",
  "ja",
  "ko",
] as const;

export const BLOG_DEFAULT_LANGUAGE = "en" as const;

export const BLOG_POST_STATUSES = ["draft", "published"] as const;

export const BLOG_CONTENT_ROOT = "src/content/blog/posts";
export const BLOG_PUBLIC_ASSET_ROOT = "/blog";
export const BLOG_STATIC_POST_GLOB = "../../content/blog/posts/*/*.json";

export const BLOG_LISTING_PAGE_SIZE = 12;
export const BLOG_RELATED_POSTS_LIMIT = 3;

export const BLOG_REQUIRED_LANGUAGE_FIELDS = [
  "title",
  "excerpt",
  "slug",
  "body",
  "metaTitle",
  "metaDescription",
  "keywords",
  "ogImage",
  "coverImage",
] as const;

export const BLOG_REQUIRED_GLOBAL_FIELDS = [
  "groupId",
  "coverImage",
  "publishableLanguage",
] as const;

export const BLOG_DEFAULT_KEYWORDS = [
  "docito",
  "doctor",
  "clinic",
  "medical platform",
  "medical management software",
  "patient record",
  "healthcare automation",
];

export const BLOG_DEFAULT_AUTHOR_NAME =
  import.meta.env.VITE_BLOG_DEFAULT_AUTHOR || "Docito Editorial Team";

export const BLOG_DEFAULT_SITE_NAME = "Docito";

export const BLOG_DEFAULT_OG_IMAGE = "/logos/social/docito-og-image.png";

export const BLOG_DEFAULT_EMPTY_DOC = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      attrs: {
        textAlign: "left",
      },
      content: [],
    },
  ],
} as const;

export const isBlogLanguage = (value: string): value is (typeof BLOG_LANGUAGES)[number] =>
  BLOG_LANGUAGES.includes(value as (typeof BLOG_LANGUAGES)[number]);

export const isBlogStatus = (value: string): value is (typeof BLOG_POST_STATUSES)[number] =>
  BLOG_POST_STATUSES.includes(value as (typeof BLOG_POST_STATUSES)[number]);
