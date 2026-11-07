import { describe, expect, test } from "bun:test";
import { clearPasswordRecovery, isPasswordRecoveryUser, trackPasswordRecovery } from "./passwordRecovery.ts";

describe("verified password recovery", () => {
  test("ordinary sign-in does not authorize recovery", () => {
    clearPasswordRecovery();
    trackPasswordRecovery("SIGNED_IN", "account-a");
    expect(isPasswordRecoveryUser("account-a")).toBe(false);
  });
  test("verified recovery authorizes only that account", () => {
    trackPasswordRecovery("PASSWORD_RECOVERY", "account-a");
    expect(isPasswordRecoveryUser("account-a")).toBe(true);
    expect(isPasswordRecoveryUser("account-b")).toBe(false);
    clearPasswordRecovery();
  });
  test("sign-out revokes recovery permission", () => {
    trackPasswordRecovery("PASSWORD_RECOVERY", "account-a");
    trackPasswordRecovery("SIGNED_OUT");
    expect(isPasswordRecoveryUser("account-a")).toBe(false);
  });
});