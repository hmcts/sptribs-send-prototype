import { describe, expect, it } from "vitest";
import { isSafeReturnTo } from "./login.js";

describe("isSafeReturnTo", () => {
  it("should accept local paths", () => {
    expect(isSafeReturnTo("/foo")).toBe(true);
    expect(isSafeReturnTo("/foo?bar=baz")).toBe(true);
    expect(isSafeReturnTo("/foo/bar")).toBe(true);
  });

  it("should reject protocol-relative URLs", () => {
    expect(isSafeReturnTo("//evil.com")).toBe(false);
  });

  it("should reject absolute URLs", () => {
    expect(isSafeReturnTo("https://evil.com")).toBe(false);
    expect(isSafeReturnTo("http://example.com/foo")).toBe(false);
  });

  it("should reject empty / undefined values", () => {
    expect(isSafeReturnTo(undefined)).toBe(false);
    expect(isSafeReturnTo("")).toBe(false);
  });

  it("should reject backslash escapes", () => {
    expect(isSafeReturnTo("/\\evil.com")).toBe(false);
  });
});
