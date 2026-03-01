import {
  errorResponse,
  jsonResponse,
  secureHandler,
  type SecureContext,
} from "./security-middleware.ts";

export interface AuthorizedBlogStudioRequest {
  context: SecureContext;
  body: unknown;
}

export const authorizeBlogStudioRequest = async (
  req: Request,
): Promise<Response | AuthorizedBlogStudioRequest> => {
  const secured = await secureHandler(req, "blog-studio", {
    requireAuth: true,
    requireRoles: ["super_admin"],
    allowedMethods: ["POST", "OPTIONS"],
    logRequests: true,
  });

  if ("response" in secured && secured.response) {
    return secured.response;
  }

  return {
    context: secured.context,
    body: secured.validatedBody,
  };
};

export const auditBlogStudioAction = async (
  context: SecureContext,
  action: string,
  details: Record<string, unknown>,
) => {
  try {
    await context.serviceClient.from("system_audit_logs").insert({
      user_id: context.user?.id || null,
      action_type: action,
      action,
      entity_type: "blog_post",
      entity_id: typeof details.groupId === "string" ? details.groupId : null,
      details,
      ip_address: context.ip,
      user_agent: null,
    } as never);
  } catch (error) {
    console.warn("[blog-studio] Failed to write audit log", error);
  }
};

export const forbiddenResponse = (message = "Forbidden") =>
  errorResponse(message, 403, "forbidden");

export const okResponse = (body: Record<string, unknown>, status = 200) =>
  jsonResponse({ ok: true, ...body }, status);
