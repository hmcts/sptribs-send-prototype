import type { Request } from "express";
import { saveSession } from "#oidc";
import { type AppealDraft, emptyDraft } from "./types.js";

declare module "express-session" {
  interface SessionData {
    /**
     * The appeal being built. In the session, so "save and come back later" is the
     * default behaviour rather than a feature, and so nothing part-finished is
     * written to CCD — a draft the citizen abandons should leave no case behind.
     */
    appeal?: AppealDraft;
    /**
     * The appeal just submitted, for the confirmation page.
     *
     * In the session rather than the URL: a case reference in a URL is also in a
     * browser history and a proxy log.
     */
    submittedAppeal?: { reference: string; childName: string };
  }
}

/** The draft on this session, created empty if this is the first page. */
export function draftFrom(req: Request): AppealDraft {
  if (!req.session.appeal) {
    req.session.appeal = emptyDraft();
  }
  return req.session.appeal;
}

/**
 * Merge answers into one section of the draft and persist the session.
 *
 * Awaited rather than left to end-of-response, because every page redirects on
 * success and express-session only writes at the end of a response: a 302 can be
 * followed before the write lands in Redis, and the next page then reads back the
 * answer the citizen has just given as missing.
 */
export async function updateDraft<K extends keyof AppealDraft>(req: Request, section: K, answers: Partial<AppealDraft[K]>): Promise<void> {
  const draft = draftFrom(req);
  draft[section] = { ...draft[section], ...answers } as AppealDraft[K];
  await saveSession(req.session);
}

/** Replace a whole section — used where a "No" answer must clear what followed it. */
export async function replaceSection<K extends keyof AppealDraft>(req: Request, section: K, value: AppealDraft[K]): Promise<void> {
  draftFrom(req)[section] = value;
  await saveSession(req.session);
}

export async function clearDraft(req: Request): Promise<void> {
  req.session.appeal = undefined;
  await saveSession(req.session);
}
