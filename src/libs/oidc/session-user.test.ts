import { describe, expect, it } from "vitest";
import { deriveUserType, landingPage } from "./session-user.js";

describe("deriveUserType", () => {
  it("should return caseworker when a bare caseworker role is present", () => {
    expect(deriveUserType(["caseworker"])).toBe("caseworker");
  });

  it("should return caseworker for any ST_CIC caseworker role variant", () => {
    expect(deriveUserType(["caseworker-st_cic"])).toBe("caseworker");
    expect(deriveUserType(["caseworker-st_cic-judge"])).toBe("caseworker");
    expect(deriveUserType(["caseworker-sptribs-superuser"])).toBe("caseworker");
  });

  it("should prefer caseworker when the user also holds citizen", () => {
    expect(deriveUserType(["citizen", "caseworker-st_cic"])).toBe("caseworker");
  });

  it("should return citizen when only citizen is present", () => {
    expect(deriveUserType(["citizen"])).toBe("citizen");
  });

  it("should throw when no supported role is present", () => {
    expect(() => deriveUserType([])).toThrow(/Unsupported IDAM role list/);
    expect(() => deriveUserType(["pui-case-manager"])).toThrow(/Unsupported IDAM role list/);
  });
});

describe("landingPage", () => {
  it("should send citizens to the task list", () => {
    expect(landingPage("citizen")).toBe("/appeal/task-list");
  });

  it("should send caseworkers to the task list too", () => {
    // There is no caseworker journey in this prototype — staff read appeals in XUI —
    // so a caseworker who signs in builds an appeal like anyone else. Useful for
    // demonstrating the journey, and harmless because the appeal is their own.
    expect(landingPage("caseworker")).toBe("/appeal/task-list");
  });
});
