import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  auditBlogStudioAction,
  authorizeBlogStudioRequest,
  okResponse,
} from "../_shared/blog-auth.ts";
import {
  buildBlogAssetRepoPath,
  buildBlogPostRepoPath,
  normalizeGitRefName,
  normalizeGroupId,
  parseBlogStudioPayload,
} from "../_shared/blog-payloads.ts";
import {
  createBranchFromBase,
  createPullRequest,
  deleteFileIfExists,
  getGitHubInstallationToken,
  getGitHubRepoConfig,
  getRepositoryDefaultBranch,
  listFilesUnderPath,
  upsertBase64File,
  upsertTextFile,
} from "../_shared/github.ts";

const buildBranchName = (groupId: string, action: "submit_for_publish" | "delete_post_group") => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return normalizeGitRefName(`blog/${action}/${normalizeGroupId(groupId)}-${timestamp}`);
};

const stringifyJson = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

serve(async (req) => {
  const authorized = await authorizeBlogStudioRequest(req);
  if (authorized instanceof Response) return authorized;

  try {
    const payload = parseBlogStudioPayload(authorized.body);
    const repoConfig = getGitHubRepoConfig();
    const githubToken = await getGitHubInstallationToken(repoConfig);
    const baseBranch =
      payload.baseBranch ||
      repoConfig.defaultBaseBranch ||
      (await getRepositoryDefaultBranch(githubToken, repoConfig));

    const branch = buildBranchName(payload.groupId, payload.action);
    await createBranchFromBase(githubToken, branch, baseBranch, repoConfig);

    const changedPaths: string[] = [];
    const deletedPaths: string[] = [];
    let lastCommitSha: string | null = null;

    if (payload.action === "submit_for_publish") {
      for (const postFile of payload.postFiles) {
        const path = buildBlogPostRepoPath(payload.groupId, postFile.lang);
        const result = await upsertTextFile(
          githubToken,
          path,
          stringifyJson(postFile.content),
          branch,
          payload.commit?.message || `blog: update ${payload.groupId}`,
          repoConfig,
        );

        changedPaths.push(path);
        lastCommitSha = result.commit.sha;
      }

      for (const assetFile of payload.assetFiles || []) {
        const path = buildBlogAssetRepoPath(payload.groupId, assetFile.filename);
        const result = await upsertBase64File(
          githubToken,
          path,
          assetFile.contentBase64,
          branch,
          payload.commit?.message || `blog: update ${payload.groupId}`,
          repoConfig,
        );

        changedPaths.push(path);
        lastCommitSha = result.commit.sha;
      }

      for (const filename of payload.deleteAssetFilenames || []) {
        const path = buildBlogAssetRepoPath(payload.groupId, filename);
        const deleted = await deleteFileIfExists(
          githubToken,
          path,
          branch,
          payload.commit?.message || `blog: update ${payload.groupId}`,
          repoConfig,
        );

        if (deleted) {
          deletedPaths.push(path);
          lastCommitSha = deleted.commit.sha;
        }
      }
    } else {
      for (const lang of payload.languages) {
        const path = buildBlogPostRepoPath(payload.groupId, lang);
        const deleted = await deleteFileIfExists(
          githubToken,
          path,
          branch,
          payload.commit?.message || `blog: delete ${payload.groupId}`,
          repoConfig,
        );

        if (deleted) {
          deletedPaths.push(path);
          lastCommitSha = deleted.commit.sha;
        }
      }

      if (payload.assetFilenames?.length) {
        for (const filename of payload.assetFilenames) {
          const path = buildBlogAssetRepoPath(payload.groupId, filename);
          const deleted = await deleteFileIfExists(
            githubToken,
            path,
            branch,
            payload.commit?.message || `blog: delete ${payload.groupId}`,
            repoConfig,
          );

          if (deleted) {
            deletedPaths.push(path);
            lastCommitSha = deleted.commit.sha;
          }
        }
      } else {
        const branchFiles = await listFilesUnderPath(
          githubToken,
          `public/blog/${normalizeGroupId(payload.groupId)}/`,
          branch,
          repoConfig,
        );

        for (const item of branchFiles) {
          const deleted = await deleteFileIfExists(
            githubToken,
            item.path,
            branch,
            payload.commit?.message || `blog: delete ${payload.groupId}`,
            repoConfig,
          );

          if (deleted) {
            deletedPaths.push(item.path);
            lastCommitSha = deleted.commit.sha;
          }
        }
      }
    }

    if (changedPaths.length === 0 && deletedPaths.length === 0) {
      throw new Error("No file changes were generated for this publish request");
    }

    const pullRequest = await createPullRequest(
      githubToken,
      {
        title: payload.pr?.title || `blog: ${payload.action} ${payload.groupId}`,
        body: payload.pr?.body || `Automated Blog Studio request for \`${payload.groupId}\`.`,
        head: branch,
        base: baseBranch,
        draft: payload.pr?.draft,
      },
      repoConfig,
    );

    await auditBlogStudioAction(authorized.context, `blog_studio.${payload.action}`, {
      groupId: payload.groupId,
      branch,
      baseBranch,
      changedPaths,
      deletedPaths,
      pullRequestNumber: pullRequest.number,
      pullRequestUrl: pullRequest.html_url,
      actorUserId: authorized.context.user?.id || null,
    });

    return okResponse({
      action: payload.action,
      groupId: payload.groupId,
      repository: {
        owner: repoConfig.owner,
        repo: repoConfig.repo,
      },
      branch,
      baseBranch,
      changedPaths,
      deletedPaths,
      commitSha: lastCommitSha,
      pullRequest: {
        number: pullRequest.number,
        url: pullRequest.html_url,
        state: pullRequest.state,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected blog publish error";

    await auditBlogStudioAction(authorized.context, "blog_studio.failed", {
      message,
    });

    return new Response(
      JSON.stringify({
        ok: false,
        error: message,
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers":
            "authorization, x-client-info, apikey, content-type, x-supabase-user, x-requested-with",
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE, PATCH",
          "Access-Control-Max-Age": "86400",
        },
      },
    );
  }
});
