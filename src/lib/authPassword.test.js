import { describe, expect, test } from "bun:test";
import { hasPassword, requiresCurrentPassword, linkedProviders } from "./authPassword.ts";

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
});
