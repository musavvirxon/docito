export type IdentityLike = { provider?: string | null };
export type UserLike = {
  identities?: IdentityLike[] | null;
  app_metadata?: { providers?: string[] | null; provider?: string | null } | null;
} | null | undefined;

export const SOCIAL_PROVIDERS = ["google", "discord", "facebook"] as const;
export type SocialProvider = (typeof SOCIAL_PROVIDERS)[number];

/** All sign-in methods linked to the account (e.g. "email", "google"). */
export function linkedProviders(user: UserLike): string[] {
  const set = new Set<string>();
  for (const i of user?.identities ?? []) if (i?.provider) set.add(i.provider);
  for (const p of user?.app_metadata?.providers ?? []) if (p) set.add(p);
  if (set.size === 0 && user?.app_metadata?.provider) set.add(user.app_metadata.provider);
  return [...set];
}

/** True when the account can already sign in with email + password. */
export function hasPassword(user: UserLike): boolean {
  return linkedProviders(user).includes("email");
}

/** Social-only accounts set a first password without the current one. */
export function requiresCurrentPassword(user: UserLike): boolean {
  return hasPassword(user);
}

export function resetPasswordRedirect(origin: string): string {
  return `${origin}/reset-password`;
}
