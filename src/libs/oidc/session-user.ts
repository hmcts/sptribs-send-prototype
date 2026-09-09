import type { Session } from "express-session";

// Promise wrapper over express-session's callback-based save(). Rejects on
// error, which reaches the global errorHandler when awaited in a handler.
export function saveSession(session: Session): Promise<void> {
  return new Promise((resolve, reject) => {
    session.save((err) => (err ? reject(err) : resolve()));
  });
}

// Augment express-session so `req.session` carries the SEND fields directly —
// no per-site cast needed to read or write them.
declare module "express-session" {
  interface SessionData {
    user?: SendUser;
    returnTo?: string;
    // OIDC handshake state — written by /login, consumed (and cleared)
    // by /oauth2-callback.
    oidcCodeVerifier?: string;
    oidcNonce?: string;
    // CSRF secret bound to this session — see src/middleware/csrf.ts.
    csrfSecret?: string;
  }
}

/**
 * Map IDAM roles onto the two user types this service serves. Substring match
 * on `caseworker` because ST_CIC issues a family of roles
 * (`caseworker-st_cic`, `caseworker-st_cic-judge`, …) and every one of them is
 * a caseworker here. Checked before `citizen` so a caseworker who also holds
 * `citizen` is treated as staff.
 */
export function deriveUserType(idamRoles: string[]): UserType {
  if (idamRoles.some((role) => role.includes("caseworker"))) {
    return "caseworker";
  }
  if (idamRoles.includes("citizen")) {
    return "citizen";
  }
  throw new Error(`Unsupported IDAM role list: ${JSON.stringify(idamRoles)}`);
}

/** Where a user lands after login when there is no `returnTo`. */
export function landingPage(userType: UserType): string {
  return LANDING_PAGE[userType];
}

const LANDING_PAGE: Record<UserType, string> = {
  // There is no caseworker journey here: staff read appeals in XUI (Manage cases).
  // A caseworker who signs in lands on the task list like anyone else, which is
  // useful for demonstrating the journey and harmless because the appeal they build
  // is their own.
  caseworker: "/appeal/task-list",
  citizen: "/appeal/task-list"
};

export type UserType = "citizen" | "caseworker";

export interface SendUser {
  sub: string;
  // IDAM uid — a real uuid. The simulator issues the email as `sub` but a
  // uuid as `uid`; CCD and RAS key on this uuid.
  uid: string;
  email: string;
  name: string;
  userType: UserType;
  idamRoles: string[];
  accessToken: string;
  idToken: string;
  refreshToken: string;
}
