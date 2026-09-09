import { describe, expect, it } from "vitest";
import { withFormAction } from "./form-action.js";

describe("withFormAction", () => {
  it("should add the origin to an existing form-action", () => {
    const policy = "default-src 'self';form-action 'self';script-src 'self'";

    expect(withFormAction(policy, "https://idam-web-public.aat.platform.hmcts.net")).toBe(
      "default-src 'self'; form-action 'self' https://idam-web-public.aat.platform.hmcts.net; script-src 'self'"
    );
  });

  it("should add the directive when the policy has none", () => {
    // A directive absent from a CSP is unrestricted, so leaving it alone would work today
    // and break the day the starter tightens its defaults.
    expect(withFormAction("default-src 'self'", "https://idam.example")).toBe("default-src 'self'; form-action 'self' https://idam.example");
  });

  it("should leave a policy that already allows the origin alone", () => {
    const policy = "form-action 'self' https://idam.example";

    expect(withFormAction(policy, "https://idam.example")).toBe(policy);
  });

  it("should not be confused by a directive whose name merely starts the same way", () => {
    const policy = "form-action 'self';frame-ancestors 'none'";

    expect(withFormAction(policy, "https://idam.example")).toContain("frame-ancestors 'none'");
  });
});
