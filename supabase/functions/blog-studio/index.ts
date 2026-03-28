import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  auditBlogStudioAction,
  authorizeBlogStudioRequest,
  okResponse,
} from "../_shared/blog-auth.ts";

const corsHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-user, x-requested-with, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE, PATCH",
  "Access-Control-Max-Age": "86400",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authorized = await authorizeBlogStudioRequest(req);
  if (authorized instanceof Response) return authorized;

  try {
    const body = authorized.body as Record<string, unknown>;
    const action = body?.action as string;

    if (!action) {
      throw new Error("action is required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    if (action === "submit_for_publish") {
      const groupId = body.groupId as string;
      if (!groupId) throw new Error("groupId is required");

      // Update all posts in this group to published status
      const { data, error } = await serviceClient
        .from("blog_posts")
        .update({
          status: "published",
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("group_id", groupId)
        .select("id, lang, slug");

      if (error) throw new Error(`Failed to publish: ${error.message}`);

      await auditBlogStudioAction(authorized.context, "blog_studio.submit_for_publish", {
        groupId,
        publishedPosts: data?.length || 0,
        actorUserId: authorized.context.user?.id || null,
      });

      return okResponse({
        action,
        groupId,
        publishedPosts: data || [],
      });
    }

    if (action === "delete_post_group") {
      const groupId = body.groupId as string;
      if (!groupId) throw new Error("groupId is required");

      const { data, error } = await serviceClient
        .from("blog_posts")
        .delete()
        .eq("group_id", groupId)
        .select("id, lang");

      if (error) throw new Error(`Failed to delete: ${error.message}`);

      await auditBlogStudioAction(authorized.context, "blog_studio.delete_post_group", {
        groupId,
        deletedPosts: data?.length || 0,
        actorUserId: authorized.context.user?.id || null,
      });

      return okResponse({
        action,
        groupId,
        deletedPosts: data || [],
      });
    }

    if (action === "unpublish") {
      const groupId = body.groupId as string;
      if (!groupId) throw new Error("groupId is required");

      const { data, error } = await serviceClient
        .from("blog_posts")
        .update({
          status: "draft",
          published_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("group_id", groupId)
        .select("id, lang");

      if (error) throw new Error(`Failed to unpublish: ${error.message}`);

      await auditBlogStudioAction(authorized.context, "blog_studio.unpublish", {
        groupId,
        unpublishedPosts: data?.length || 0,
        actorUserId: authorized.context.user?.id || null,
      });

      return okResponse({
        action,
        groupId,
        unpublishedPosts: data || [],
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected blog studio error";

    await auditBlogStudioAction(authorized.context, "blog_studio.failed", { message });

    return new Response(
      JSON.stringify({ ok: false, error: message }),
      { status: 400, headers: corsHeaders },
    );
  }
});
