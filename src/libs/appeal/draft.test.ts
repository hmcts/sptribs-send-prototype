import type { Request } from "express";
import { describe, expect, it, vi } from "vitest";
import { clearDraft, draftFrom, replaceSection, updateDraft } from "./draft.js";

/**
 * The draft is the appeal. Everything a citizen types lives here until the declaration is
 * signed, so the property that matters is that a write is *persisted before the redirect* —
 * express-session only writes at the end of a response, and a 302 can be followed before
 * that write reaches Redis. When it is not awaited, the next page reads back the answer the
 * citizen has just given as missing.
 */

function fakeRequest(): Request & { session: { save: ReturnType<typeof vi.fn>; appeal?: unknown } } {
  const save = vi.fn((callback: (error?: Error) => void) => callback());
  return { session: { save } } as unknown as Request & { session: { save: ReturnType<typeof vi.fn>; appeal?: unknown } };
}

describe("draftFrom", () => {
  it("should create an empty draft on the first page rather than return undefined", () => {
    const req = fakeRequest();

    const draft = draftFrom(req);

    expect(draft.childOrYoungPerson).toEqual({});
    expect(draft.supportingEvidence).toEqual([]);
  });

  it("should return the same draft on later calls", async () => {
    const req = fakeRequest();
    await updateDraft(req, "childOrYoungPerson", { firstName: "Amara" });

    expect(draftFrom(req).childOrYoungPerson.firstName).toBe("Amara");
  });
});

describe("updateDraft", () => {
  it("should merge into a section rather than replace it", async () => {
    const req = fakeRequest();

    await updateDraft(req, "childOrYoungPerson", { firstName: "Amara" });
    await updateDraft(req, "childOrYoungPerson", { lastName: "Okonjo" });

    expect(draftFrom(req).childOrYoungPerson).toEqual({ firstName: "Amara", lastName: "Okonjo" });
  });

  it("should persist the session before returning", async () => {
    const req = fakeRequest();

    await updateDraft(req, "reasons", { appealReasons: "Because" });

    // Not incidental: the caller redirects immediately afterwards.
    expect(req.session.save).toHaveBeenCalled();
  });

  it("should reject when the session cannot be saved, rather than lose the answer quietly", async () => {
    const req = fakeRequest();
    req.session.save.mockImplementation((callback: (error?: Error) => void) => callback(new Error("redis is down")));

    await expect(updateDraft(req, "reasons", { appealReasons: "Because" })).rejects.toThrow("redis is down");
  });
});

describe("replaceSection", () => {
  it("should replace a section wholesale, which is what clears answers a No has invalidated", async () => {
    const req = fakeRequest();
    await updateDraft(req, "representative", { hasRepresentative: "Yes", firstName: "Ada", lastName: "Nwosu" });

    await replaceSection(req, "representative", { hasRepresentative: "No" });

    expect(draftFrom(req).representative).toEqual({ hasRepresentative: "No" });
  });
});

describe("clearDraft", () => {
  it("should leave nothing behind, so a refresh cannot submit the same appeal twice", async () => {
    const req = fakeRequest();
    await updateDraft(req, "childOrYoungPerson", { firstName: "Amara" });

    await clearDraft(req);

    expect(req.session.appeal).toBeUndefined();
    // The next call starts a fresh appeal rather than resurrecting the old one.
    expect(draftFrom(req).childOrYoungPerson).toEqual({});
  });
});
