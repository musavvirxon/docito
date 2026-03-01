import { SignJWT, importPKCS8 } from "https://esm.sh/jose@5.9.6?target=deno";

type GitHubRepoConfig = {
  owner: string;
  repo: string;
  appId: string;
  installationId: string;
  privateKey: string;
  defaultBaseBranch?: string;
};

type GitHubTreeItem = {
  path: string;
  mode: string;
  type: "blob" | "tree" | "commit";
  sha: string;
  url: string;
};

type GitHubPullRequest = {
  number: number;
  html_url: string;
  state: string;
};

const GITHUB_API_URL = "https://api.github.com";

const getRequiredEnv = (name: string) => {
  const value = Deno.env.get(name)?.trim();
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
};

const asGitHubPrivateKey = (value: string) => value.replace(/\\n/g, "\n");

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};

const createGitHubAppJwt = async (appId: string, privateKeyPem: string) => {
  const privateKey = await importPKCS8(privateKeyPem, "RS256");
  const now = Math.floor(Date.now() / 1000);

  return await new SignJWT({})
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuedAt(now - 60)
    .setExpirationTime(now + 9 * 60)
    .setIssuer(appId)
    .sign(privateKey);
};

const githubRequest = async <T>(
  path: string,
  options: {
    method?: string;
    token: string;
    body?: unknown;
    headers?: Record<string, string>;
  },
): Promise<T> => {
  const response = await fetch(`${GITHUB_API_URL}${path}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${options.token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...options.headers,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API ${options.method || "GET"} ${path} failed: ${response.status} ${text}`);
  }

  return (await response.json()) as T;
};

export const getGitHubRepoConfig = (): GitHubRepoConfig => ({
  owner: getRequiredEnv("GITHUB_OWNER"),
  repo: getRequiredEnv("GITHUB_REPO"),
  appId: getRequiredEnv("GITHUB_APP_ID"),
  installationId: getRequiredEnv("GITHUB_APP_INSTALLATION_ID"),
  privateKey: asGitHubPrivateKey(getRequiredEnv("GITHUB_APP_PRIVATE_KEY")),
  defaultBaseBranch: Deno.env.get("GITHUB_BASE_BRANCH")?.trim() || "main",
});

export const getGitHubInstallationToken = async (config = getGitHubRepoConfig()) => {
  const appJwt = await createGitHubAppJwt(config.appId, config.privateKey);
  const response = await fetch(
    `${GITHUB_API_URL}/app/installations/${config.installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${appJwt}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to create GitHub installation token: ${response.status} ${text}`);
  }

  const data = (await response.json()) as { token: string };
  if (!data.token) throw new Error("GitHub installation token is missing");
  return data.token;
};

export const getRepositoryDefaultBranch = async (token: string, config = getGitHubRepoConfig()) => {
  const repo = await githubRequest<{ default_branch: string }>(
    `/repos/${config.owner}/${config.repo}`,
    {
      token,
    },
  );

  return repo.default_branch || config.defaultBaseBranch || "main";
};

export const getBranchHeadSha = async (
  token: string,
  branch: string,
  config = getGitHubRepoConfig(),
) => {
  const ref = await githubRequest<{ object: { sha: string } }>(
    `/repos/${config.owner}/${config.repo}/git/ref/heads/${encodeURIComponent(branch)}`,
    {
      token,
    },
  );

  return ref.object.sha;
};

export const createBranchFromBase = async (
  token: string,
  branch: string,
  baseBranch: string,
  config = getGitHubRepoConfig(),
) => {
  const baseSha = await getBranchHeadSha(token, baseBranch, config);

  try {
    await githubRequest<{ ref: string; object: { sha: string } }>(
      `/repos/${config.owner}/${config.repo}/git/refs`,
      {
        method: "POST",
        token,
        body: {
          ref: `refs/heads/${branch}`,
          sha: baseSha,
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("Reference already exists")) {
      throw error;
    }
  }

  return {
    branch,
    baseBranch,
    baseSha,
  };
};

export const getFileMetadata = async (
  token: string,
  path: string,
  ref?: string,
  config = getGitHubRepoConfig(),
) => {
  const query = ref ? `?ref=${encodeURIComponent(ref)}` : "";
  const response = await fetch(
    `${GITHUB_API_URL}/repos/${config.owner}/${config.repo}/contents/${path}${query}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );

  if (response.status === 404) return null;
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to read file metadata for ${path}: ${response.status} ${text}`);
  }

  return (await response.json()) as { sha: string; path: string };
};

export const upsertTextFile = async (
  token: string,
  path: string,
  text: string,
  branch: string,
  message: string,
  config = getGitHubRepoConfig(),
) => {
  const existing = await getFileMetadata(token, path, branch, config);
  const contentBase64 = arrayBufferToBase64(new TextEncoder().encode(text).buffer);

  return await githubRequest<{
    content: { path: string; sha: string };
    commit: { sha: string; html_url: string | null };
  }>(`/repos/${config.owner}/${config.repo}/contents/${path}`, {
    method: "PUT",
    token,
    body: {
      message,
      content: contentBase64,
      branch,
      sha: existing?.sha,
    },
  });
};

export const upsertBase64File = async (
  token: string,
  path: string,
  contentBase64: string,
  branch: string,
  message: string,
  config = getGitHubRepoConfig(),
) => {
  const existing = await getFileMetadata(token, path, branch, config);

  return await githubRequest<{
    content: { path: string; sha: string };
    commit: { sha: string; html_url: string | null };
  }>(`/repos/${config.owner}/${config.repo}/contents/${path}`, {
    method: "PUT",
    token,
    body: {
      message,
      content: contentBase64,
      branch,
      sha: existing?.sha,
    },
  });
};

export const deleteFileIfExists = async (
  token: string,
  path: string,
  branch: string,
  message: string,
  config = getGitHubRepoConfig(),
) => {
  const existing = await getFileMetadata(token, path, branch, config);
  if (!existing?.sha) return null;

  return await githubRequest<{
    commit: { sha: string; html_url: string | null };
  }>(`/repos/${config.owner}/${config.repo}/contents/${path}`, {
    method: "DELETE",
    token,
    body: {
      message,
      branch,
      sha: existing.sha,
    },
  });
};

export const listFilesUnderPath = async (
  token: string,
  rootPath: string,
  ref: string,
  config = getGitHubRepoConfig(),
) => {
  const tree = await githubRequest<{ tree: GitHubTreeItem[] }>(
    `/repos/${config.owner}/${config.repo}/git/trees/${encodeURIComponent(ref)}?recursive=1`,
    {
      token,
    },
  );

  return tree.tree.filter((item) => item.type === "blob" && item.path.startsWith(rootPath));
};

export const createPullRequest = async (
  token: string,
  input: {
    title: string;
    body: string;
    head: string;
    base: string;
    draft?: boolean;
  },
  config = getGitHubRepoConfig(),
): Promise<GitHubPullRequest> => {
  return await githubRequest<GitHubPullRequest>(
    `/repos/${config.owner}/${config.repo}/pulls`,
    {
      method: "POST",
      token,
      body: {
        title: input.title,
        body: input.body,
        head: input.head,
        base: input.base,
        draft: Boolean(input.draft),
      },
    },
  );
};
