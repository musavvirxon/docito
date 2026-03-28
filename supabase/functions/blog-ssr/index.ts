import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SITE_URL = "https://www.docito.app";

const CRAWLER_AGENTS = [
  "googlebot", "bingbot", "yandexbot", "duckduckbot", "baiduspider",
  "twitterbot", "facebookexternalhit", "linkedinbot", "slurp",
  "applebot", "semrushbot", "ahrefsbot", "mj12bot", "dotbot",
  "rogerbot", "embedly", "quora link preview", "showyoubot",
  "outbrain", "pinterestbot", "slackbot", "vkshare", "w3c_validator",
  "whatsapp", "telegrambot", "ia_archiver", "petalbot",
  "gptbot", "chatgpt-user", "claudebot", "anthropic-ai",
];

function isCrawler(ua: string): boolean {
  const lower = ua.toLowerCase();
  return CRAWLER_AGENTS.some((bot) => lower.includes(bot));
}

interface DocNode {
  type: string;
  text?: string;
  content?: DocNode[];
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
}

function renderDocToHtml(node: DocNode): string {
  if (node.type === "text") {
    let text = escapeHtml(node.text || "");
    if (node.marks) {
      for (const mark of node.marks) {
        if (mark.type === "bold") text = `<strong>${text}</strong>`;
        else if (mark.type === "italic") text = `<em>${text}</em>`;
        else if (mark.type === "underline") text = `<u>${text}</u>`;
        else if (mark.type === "link") text = `<a href="${escapeHtml(String(mark.attrs?.href || ""))}">${text}</a>`;
      }
    }
    return text;
  }

  const children = (node.content || []).map(renderDocToHtml).join("");

  switch (node.type) {
    case "doc": return children;
    case "paragraph": return `<p>${children}</p>`;
    case "heading": {
      const level = node.attrs?.level || 2;
      return `<h${level}>${children}</h${level}>`;
    }
    case "bulletList": return `<ul>${children}</ul>`;
    case "orderedList": return `<ol>${children}</ol>`;
    case "listItem": return `<li>${children}</li>`;
    case "blockquote": return `<blockquote>${children}</blockquote>`;
    case "codeBlock": return `<pre><code>${children}</code></pre>`;
    case "horizontalRule": return "<hr />";
    case "image": return `<img src="${escapeHtml(String(node.attrs?.src || ""))}" alt="${escapeHtml(String(node.attrs?.alt || ""))}" />`;
    default: return children;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const ua = req.headers.get("user-agent") || "";

    // Parse path: expect /blog-ssr?lang=xx&slug=yy
    const lang = url.searchParams.get("lang");
    const slug = url.searchParams.get("slug");

    if (!lang || !slug) {
      return new Response(JSON.stringify({ ok: false, error: "Missing lang or slug" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If not a crawler, redirect to SPA
    if (!isCrawler(ua)) {
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, Location: `${SITE_URL}/${lang}/blog/${slug}` },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: post, error } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("status", "published")
      .eq("lang", lang)
      .eq("slug", slug)
      .maybeSingle();

    if (error) throw error;
    if (!post) {
      return new Response("Not Found", { status: 404, headers: corsHeaders });
    }

    // Get translations for hreflang
    const { data: translations } = await supabase
      .from("blog_posts")
      .select("lang, slug")
      .eq("group_id", post.group_id)
      .eq("status", "published");

    const canonicalUrl = `${SITE_URL}/${post.lang}/blog/${post.slug}`;
    const title = post.meta_title || post.title || "";
    const description = post.meta_description || post.excerpt || "";
    const ogImage = post.og_image || post.cover_image || "";
    const keywords = (post.keywords || []).join(", ");
    const bodyHtml = post.body ? renderDocToHtml(post.body as DocNode) : "";

    const hreflangTags = (translations || [])
      .map((t) => `<link rel="alternate" hreflang="${t.lang}" href="${SITE_URL}/${t.lang}/blog/${t.slug}" />`)
      .join("\n    ");

    const structuredData = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: title,
      description,
      inLanguage: post.lang,
      mainEntityOfPage: canonicalUrl,
      image: ogImage ? [ogImage] : undefined,
      datePublished: post.published_at,
      dateModified: post.updated_at,
      author: { "@type": "Organization", name: "Docito" },
      publisher: {
        "@type": "Organization",
        name: "Docito",
        logo: { "@type": "ImageObject", url: `${SITE_URL}/logos/logo.png` },
      },
      keywords: keywords || undefined,
    });

    const html = `<!DOCTYPE html>
<html lang="${escapeHtml(post.lang)}">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)} | Docito Blog</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="keywords" content="${escapeHtml(keywords)}" />
    <link rel="canonical" href="${canonicalUrl}" />
    ${hreflangTags}
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${canonicalUrl}" />
    ${ogImage ? `<meta property="og:image" content="${escapeHtml(ogImage)}" />` : ""}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    ${ogImage ? `<meta name="twitter:image" content="${escapeHtml(ogImage)}" />` : ""}
    <script type="application/ld+json">${structuredData}</script>
</head>
<body>
    <article>
        <h1>${escapeHtml(post.title || "")}</h1>
        ${post.author_name ? `<p>By ${escapeHtml(post.author_name)}</p>` : ""}
        ${post.published_at ? `<time datetime="${post.published_at}">${new Date(post.published_at).toLocaleDateString()}</time>` : ""}
        ${post.cover_image ? `<img src="${escapeHtml(post.cover_image)}" alt="${escapeHtml(post.title || "")}" />` : ""}
        <div>${bodyHtml}</div>
        ${(post.tags || []).length > 0 ? `<footer><p>Tags: ${(post.tags as string[]).join(", ")}</p></footer>` : ""}
    </article>
</body>
</html>`;

    return new Response(html, {
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
