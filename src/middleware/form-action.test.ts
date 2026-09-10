import { describe, expect, it, vi } from "vitest";
import { allowIdamFormAction, withFormAction } from "./form-action.js";

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

describe("allowIdamFormAction", () => {
  const responseWith = (header?: string) => {
    const headers = new Map<string, string>();
    if (header) {
      headers.set("Content-Security-Policy", header);
    }
    return {
      getHeader: (name: string) => headers.get(name),
      setHeader: (name: string, value: string) => headers.set(name, value),
      header: () => headers.get("Content-Security-Policy")
    };
  };

  it("should add the IDAM origin to the policy the starter already set", () => {
    const res = responseWith("default-src 'self'; form-action 'self'");
    const next = vi.fn();

    allowIdamFormAction("https://idam-web-public.aat.platform.hmcts.net/o")({} as never, res as never, next as never);

    // The origin only — a CSP source expression has no path.
    expect(res.header()).toBe("default-src 'self'; form-action 'self' https://idam-web-public.aat.platform.hmcts.net");
    expect(next).toHaveBeenCalled();
  });

  it("should leave the response alone when no policy has been set", () => {
    const res = responseWith();
    const next = vi.fn();

    allowIdamFormAction("https://idam.example/o")({} as never, res as never, next as never);

    expect(res.header()).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });

  it("should not break the request when the issuer is not a URL", () => {
    // Misconfiguration should degrade to "no extra allowance", not a 500 on every page.
    const res = responseWith("form-action 'self'");
    const next = vi.fn();

    allowIdamFormAction("not-a-url")({} as never, res as never, next as never);

    expect(res.header()).toBe("form-action 'self'");
    expect(next).toHaveBeenCalled();
  });
});
