import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import type { SendUser } from "../session-user.js";
import { setUser } from "./set-user.js";

describe("setUser", () => {
  it("should leave req.user undefined and mark not signed in when the session has no user", () => {
    const req = { session: {} } as unknown as Request;
    const res = { locals: {} } as unknown as Response;
    const next = vi.fn() as unknown as NextFunction;

    setUser()(req, res, next);

    expect(req.user).toBeUndefined();
    expect(res.locals.isSignedIn).toBe(false);
    expect(next).toHaveBeenCalledOnce();
  });

  it("should copy session.user onto req.user", () => {
    const user: SendUser = {
      sub: "u-citizen-1",
      uid: "u-citizen-1",
      email: "citizen@dev.local",
      name: "Alex Citizen",
      userType: "citizen",
      idamRoles: ["citizen"],
      accessToken: "a",
      idToken: "i",
      refreshToken: "r"
    };
    const req = { session: { user } } as unknown as Request;
    const res = { locals: {} } as unknown as Response;
    const next = vi.fn() as unknown as NextFunction;

    setUser()(req, res, next);

    expect(req.user).toBe(user);
    expect(res.locals.isSignedIn).toBe(true);
    expect(next).toHaveBeenCalledOnce();
  });
});
