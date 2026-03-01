import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT_DIR = process.cwd();
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const POSTS_DIR = path.join(ROOT_DIR, "src", "content", "blog", "posts");

const SITE_URL = (
  process.env.VITE_SITE_URL ||
  process.env.VITE_PUBLIC_SITE_URL ||
  process.env.VITE_APP_URL ||
  process.env.SITE_URL ||
  "https://www.docito.app"
).replace(/\/+$/, "");

const BLOG_LANGUAGES = ["en", "ru", "uz", "ar", "tr", "es", "de", "zh", "pt", "ja", "ko"];

const escapeXml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const normalizeSlug = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0400-\u04ff\u0600-\u06ff\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af\s-]/g, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

const ensureDir = async (dir) => {
  await fs.mkdir(dir, { recursive: true });
};

const fileExists = async (targetPath) => {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
};

const readJson = async (targetPath) => {
  const raw = await fs.readFile(targetPath, "utf8");
  return JSON.parse(raw);
};

const getAllPostFiles = async (dir) => {
  if (!(await fileExists(dir))) {
    return [];
  }

  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await getAllPostFiles(target)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(target);
    }
  }

  return files;
};

const parsePost = async (filePath) => {
  const json = await readJson(filePath);

  if (!json || typeof json !== "object") return null;
  if (json.status !== "published") return null;
  if (!BLOG_LANGUAGES.includes(json.lang)) return null;

  const lang = json.lang;
  const groupId = String(json.groupId || "").trim();
  const slug = normalizeSlug(json.slug);
  if (!groupId || !slug) return null;

  const updatedAt =
    json.updatedAt ||
    json.publishedAt ||
    json.createdAt ||
    new Date().toISOString();

  return {
    groupId,
    lang,
    slug,
    title: String(json.title || ""),
    excerpt: String(json.excerpt || ""),
    tags: Array.isArray(json.tags)
      ? json.tags.filter((item) => typeof item === "string")
      : [],
    coverImage: String(json.coverImage || ""),
    ogImage:
      json?.seo && typeof json.seo === "object" ? String(json.seo.ogImage || "") : "",
    metaTitle:
      json?.seo && typeof json.seo === "object" ? String(json.seo.metaTitle || "") : "",
    metaDescription:
      json?.seo && typeof json.seo === "object"
        ? String(json.seo.metaDescription || "")
        : "",
    publishedAt: json.publishedAt || updatedAt,
    updatedAt,
    absoluteUrl: `${SITE_URL}/${lang}/blog/${slug}`,
  };
};

const toIsoDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
};

const toRfc822Date = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toUTCString();
  }
  return date.toUTCString();
};

const buildAlternateLinks = (translations) => {
  const ordered = BLOG_LANGUAGES
    .map((lang) => translations.find((translation) => translation.lang === lang))
    .filter(Boolean);

  if (ordered.length === 0) return [];

  const xDefault = ordered.find((item) => item.lang === "en") || ordered[0];

  return [
    ...ordered.map((item) => ({
      hrefLang: item.lang,
      href: item.absoluteUrl,
    })),
    {
      hrefLang: "x-default",
      href: xDefault.absoluteUrl,
    },
  ];
};

const buildBlogSitemapXml = (posts) => {
  const grouped = new Map();

  posts.forEach((post) => {
    if (!grouped.has(post.groupId)) {
      grouped.set(post.groupId, []);
    }
    grouped.get(post.groupId).push(post);
  });

  const urls = posts
    .slice()
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .map((post) => {
      const alternates = buildAlternateLinks(grouped.get(post.groupId) || []);
      const alternateXml = alternates
        .map(
          (alternate) =>
            `    <xhtml:link rel="alternate" hreflang="${escapeXml(alternate.hrefLang)}" href="${escapeXml(alternate.href)}" />`,
        )
        .join("\n");

      return [
        "  <url>",
        `    <loc>${escapeXml(post.absoluteUrl)}</loc>`,
        alternateXml,
        `    <lastmod>${escapeXml(toIsoDate(post.updatedAt))}</lastmod>`,
        "    <changefreq>weekly</changefreq>",
        post.lang === "en" ? "    <priority>0.8</priority>" : "    <priority>0.7</priority>",
        "  </url>",
      ]
        .filter(Boolean)
        .join("\n");
    });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...urls,
    "</urlset>",
    "",
  ].join("\n");
};

const buildSitemapIndexXml = (blogLastMod) => {
  const today = blogLastMod || toIsoDate(new Date().toISOString());

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    "  <sitemap>",
    `    <loc>${escapeXml(`${SITE_URL}/sitemap.xml`)}</loc>`,
    `    <lastmod>${escapeXml(today)}</lastmod>`,
    "  </sitemap>",
    "  <sitemap>",
    `    <loc>${escapeXml(`${SITE_URL}/sitemap-blog.xml`)}</loc>`,
    `    <lastmod>${escapeXml(today)}</lastmod>`,
    "  </sitemap>",
    "</sitemapindex>",
    "",
  ].join("\n");
};

const buildRssXml = (posts) => {
  const englishPosts = posts
    .filter((post) => post.lang === "en")
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 25);

  const latestDate =
    englishPosts[0]?.publishedAt ||
    new Date().toISOString();

  const items = englishPosts.map((post) => {
    const categories = post.tags
      .map((tag) => `      <category>${escapeXml(tag)}</category>`)
      .join("\n");

    const description = post.metaDescription || post.excerpt || post.title;
    const image = post.ogImage || post.coverImage;
    const enclosure = image
      ? `      <enclosure url="${escapeXml(image.startsWith("http") ? image : `${SITE_URL}${image.startsWith("/") ? image : `/${image}`}`)}" type="image/jpeg" />`
      : "";

    return [
      "    <item>",
      `      <title>${escapeXml(post.metaTitle || post.title)}</title>`,
      `      <link>${escapeXml(post.absoluteUrl)}</link>`,
      `      <guid isPermaLink="true">${escapeXml(post.absoluteUrl)}</guid>`,
      `      <pubDate>${escapeXml(toRfc822Date(post.publishedAt))}</pubDate>`,
      `      <description><![CDATA[${description}]]></description>`,
      categories,
      enclosure,
      "    </item>",
    ]
      .filter(Boolean)
      .join("\n");
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    "  <channel>",
    "    <title>Docito Blog</title>",
    `    <link>${escapeXml(`${SITE_URL}/en/blog`)}</link>`,
    "    <description>Healthcare automation, clinic operations, patient records, and medical platform insights from Docito.</description>",
    "    <language>en</language>",
    `    <lastBuildDate>${escapeXml(toRfc822Date(latestDate))}</lastBuildDate>`,
    ...items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
};

const buildRobotsTxt = () =>
  [
    "User-agent: Googlebot",
    "Allow: /",
    "",
    "User-agent: Bingbot",
    "Allow: /",
    "",
    "User-agent: Twitterbot",
    "Allow: /",
    "",
    "User-agent: facebookexternalhit",
    "Allow: /",
    "",
    "User-agent: YandexBot",
    "Allow: /",
    "",
    "User-agent: *",
    "Allow: /",
    "",
    `Sitemap: ${SITE_URL}/sitemap-index.xml`,
    `Sitemap: ${SITE_URL}/sitemap-blog.xml`,
    "",
  ].join("\n");

const main = async () => {
  await ensureDir(PUBLIC_DIR);

  const files = await getAllPostFiles(POSTS_DIR);
  const parsedPosts = (
    await Promise.all(
      files.map(async (filePath) => {
        try {
          return await parsePost(filePath);
        } catch (error) {
          console.error(`Failed to parse blog file: ${filePath}`);
          throw error;
        }
      }),
    )
  ).filter(Boolean);

  const latestBlogLastMod = parsedPosts.length
    ? toIsoDate(
        parsedPosts
          .map((post) => post.updatedAt || post.publishedAt)
          .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0],
      )
    : toIsoDate(new Date().toISOString());

  await Promise.all([
    fs.writeFile(
      path.join(PUBLIC_DIR, "sitemap-blog.xml"),
      buildBlogSitemapXml(parsedPosts),
      "utf8",
    ),
    fs.writeFile(
      path.join(PUBLIC_DIR, "sitemap-index.xml"),
      buildSitemapIndexXml(latestBlogLastMod),
      "utf8",
    ),
    fs.writeFile(
      path.join(PUBLIC_DIR, "rss.xml"),
      buildRssXml(parsedPosts),
      "utf8",
    ),
    fs.writeFile(
      path.join(PUBLIC_DIR, "robots.txt"),
      buildRobotsTxt(),
      "utf8",
    ),
  ]);

  console.log(
    `[blog:generate] Generated sitemap-blog.xml, sitemap-index.xml, rss.xml, and robots.txt for ${parsedPosts.length} published blog translations.`,
  );
};

main().catch((error) => {
  console.error("[blog:generate] Failed:", error);
  process.exit(1);
});
