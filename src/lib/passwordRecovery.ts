// Set only by the Auth SDK's verified recovery event, never by URL text.
let recoveryUserId: string | null = null;

export function trackPasswordRecovery(event: string, userId?: string) {
  if (event === "PASSWORD_RECOVERY") recoveryUserId = userId ?? null;
  if (event === "SIGNED_OUT") recoveryUserId = null;
}

export function isPasswordRecoveryUser(userId: string | undefined): boolean {
  return Boolean(userId && recoveryUserId === userId);
}

export function clearPasswordRecovery() {
  recoveryUserId = null;
}