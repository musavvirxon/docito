import { describe, expect, test } from "bun:test";
import { hasPassword, requiresCurrentPassword, linkedProviders, passwordUpdateAttributes } from "./authPassword.ts";

describe("account sign-in methods", () => {
  test("Google-only user has no password and needs no current password", () => {
    const u = { identities: [{ provider: "google" }] };
    expect(hasPassword(u)).toBe(false);
    expect(requiresCurrentPassword(u)).toBe(false);
  });
  test("email + google user can use both methods", () => {
    const u = { identities: [{ provider: "email" }, { provider: "google" }] };
    expect(linkedProviders(u).sort()).toEqual(["email", "google"]);
    expect(requiresCurrentPassword(u)).toBe(true);
  });
  for (const provider of ["google", "discord", "facebook"]) {
    test(`${provider} account sets its first password without an old password`, () => {
      expect(passwordUpdateAttributes({ identities: [{ provider }] }, "new-secret", "")).toEqual({ password: "new-secret" });
    });
  }
  test("email account supplies the current password for a signed-in change", () => {
    const user = { identities: [{ provider: "email" }] };
    expect(passwordUpdateAttributes(user, "new-secret", "old-secret")).toEqual({ password: "new-secret", current_password: "old-secret" });
    expect(() => passwordUpdateAttributes(user, "new-secret", "")).toThrow("Current password required");
  });
  test("recovery never sends the old password", () => {
    expect(passwordUpdateAttributes({ identities: [{ provider: "email" }] }, "new-secret", "", true)).toEqual({ password: "new-secret" });
  });
});
