import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import type { SendUser } from "../session-user.js";
import { requireRole } from "./require-role.js";

describe("requireRole", () => {
  it("should redirect anonymous users to /login with returnTo set", () => {
    const req = { user: undefined, originalUrl: "/forms" } as unknown as Request;
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    requireRole("caseworker")(req, res, next);

    expect(res.redirect).toHaveBeenCalledWith(302, "/login?returnTo=%2Fforms");
    expect(next).not.toHaveBeenCalled();
  });

  it("should 403 + render forbidden when user type is not allowed", () => {
    const req = makeReq("citizen");
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    requireRole("caseworker")(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.render).toHaveBeenCalledWith("_errors/forbidden", expect.objectContaining({ en: expect.any(Object), cy: expect.any(Object) }));
    expect(next).not.toHaveBeenCalled();
  });

  it("should call next when user type matches", () => {
    const req = makeReq("caseworker");
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    requireRole("caseworker")(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("should accept a mixed allowed list", () => {
    const req = makeReq("citizen");
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    requireRole(["citizen", "caseworker"])(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });
});

function makeReq(userType: SendUser["userType"]): Request {
  return { user: { userType } as SendUser, originalUrl: "/x" } as unknown as Request;
}

function makeRes() {
  const res = {
    redirect: vi.fn(),
    status: vi.fn(),
    render: vi.fn()
  };
  res.status.mockReturnValue(res);
  return res as unknown as Response & typeof res;
}
