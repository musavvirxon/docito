import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SITE_URL = "https://www.docito.app";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: posts, error } = await supabase
      .from("blog_posts")
      .select("slug, lang, group_id, updated_at, published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false });

    if (error) throw error;

    // Group by group_id to build hreflang alternates
    const groups = new Map<string, typeof posts>();
    for (const post of posts || []) {
      if (!groups.has(post.group_id)) groups.set(post.group_id, []);
      groups.get(post.group_id)!.push(post);
    }

    let urls = "";
    for (const [, groupPosts] of groups) {
      for (const post of groupPosts) {
        const loc = `${SITE_URL}/${post.lang}/blog/${post.slug}`;
        const lastmod = (post.updated_at || post.published_at || "").substring(0, 10);

        let alternates = "";
        for (const alt of groupPosts) {
          alternates += `    <xhtml:link rel="alternate" hreflang="${alt.lang}" href="${SITE_URL}/${alt.lang}/blog/${alt.slug}" />\n`;
        }

        urls += `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n${alternates}  </url>\n`;
      }
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}</urlset>`;

    return new Response(xml, {
      headers: { ...corsHeaders, "Content-Type": "application/xml; charset=utf-8" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
