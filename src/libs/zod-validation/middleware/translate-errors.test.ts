import type { Request, Response } from "express";
import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { translateErrors } from "./translate-errors.js";

const en = { title: "Your name", errors: { firstNameRequired: "Enter your first name" } };
const cy = { title: "Eich enw", errors: { firstNameRequired: "Rhowch eich enw cyntaf" } };

function setup(locale: string) {
  const originalRender = vi.fn<(view: string, options: RenderedOptions, callback?: unknown) => void>();
  const res = { locals: { locale }, render: originalRender } as unknown as Response;
  translateErrors()({} as Request, res, vi.fn());
  return { res, originalRender };
}

/** What the middleware hands the next renderer — the starter's interceptor, in the real app. */
interface RenderedOptions {
  en?: Record<string, unknown> | ((context: Record<string, unknown>) => Record<string, unknown>);
  cy?: Record<string, unknown> | ((context: Record<string, unknown>) => Record<string, unknown>);
  errors?: Record<string, string>;
  [key: string]: unknown;
}

describe("translateErrors", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should resolve error keys against the selected locale content", () => {
    const { res, originalRender } = setup("en");

    res.render("name", { en, cy, errors: { firstName: "firstNameRequired" } });

    expect(originalRender).toHaveBeenCalledWith("name", expect.objectContaining({ errors: { firstName: "Enter your first name" } }), undefined);
  });

  it("should resolve against Welsh content when locale is cy", () => {
    const { res, originalRender } = setup("cy");

    res.render("name", { en, cy, errors: { firstName: "firstNameRequired" } });

    expect(originalRender).toHaveBeenCalledWith("name", expect.objectContaining({ errors: { firstName: "Rhowch eich enw cyntaf" } }), undefined);
  });

  it("should call function-form content with the view model as context", () => {
    const { res, originalRender } = setup("en");
    const enFn = (m: { maxLength: number }) => ({ errors: { tooLong: `Max ${m.maxLength}` } });
    const cyFn = (m: { maxLength: number }) => ({ errors: { tooLong: `Uchafswm ${m.maxLength}` } });

    res.render("name", { en: enFn, cy: cyFn, maxLength: 100, errors: { field: "tooLong" } });

    expect(originalRender).toHaveBeenCalledWith("name", expect.objectContaining({ errors: { field: "Max 100" } }), undefined);
  });

  // The bug this middleware exists to prevent. The content's `errors` is a
  // dictionary of key → message; left in place, the starter's locale interceptor
  // spreads it onto the view model, `{% if errors %}` is true on a first view,
  // and the page shows an error summary before it has been submitted.
  it("should strip the content's error dictionary so it cannot reach the view model", () => {
    const { res, originalRender } = setup("en");

    res.render("name", { en, cy });

    const [, options] = originalRender.mock.calls[0];
    expect(options.en).toEqual({ title: "Your name" });
    expect(options.cy).toEqual({ title: "Eich enw" });
  });

  it("should strip the dictionary from function-form content while keeping it a function", () => {
    const { res, originalRender } = setup("en");
    const enFn = (m: { name: string }) => ({ greeting: `Hello ${m.name}`, errors: { required: "Enter it" } });

    res.render("name", { en: enFn, cy: enFn, name: "Alex" });

    const [, options] = originalRender.mock.calls[0];
    // Still a function, so the starter interpolates it against the view model
    // exactly as before — only the dictionary is gone.
    expect(typeof options.en).toBe("function");
    expect(options.en({ name: "Alex" })).toEqual({ greeting: "Hello Alex" });
  });

  it("should render with no errors when the handler passed none", () => {
    const { res, originalRender } = setup("en");

    res.render("name", { en, cy });

    expect(originalRender.mock.calls[0][1].errors).toBeUndefined();
  });

  it("should leave options untouched when there is no locale content", () => {
    const { res, originalRender } = setup("en");
    const options = { errors: { firstName: "firstNameRequired" } };

    res.render("name", options);

    expect(originalRender).toHaveBeenCalledWith("name", options, undefined);
  });

  it("should pass a content key through when the dictionary has no entry for it", () => {
    const { res, originalRender } = setup("en");

    res.render("name", { en, cy, errors: { firstName: "Already a sentence" } });

    expect(originalRender.mock.calls[0][1].errors).toEqual({ firstName: "Already a sentence" });
  });

  // The starter's interceptor spreads res.locals onto the view model too, so an
  // `errors` that got into locals would show through on a page nobody submitted
  // just as the content dictionary did. `errors` is set unconditionally here so
  // that this render's answer is the only one a template can see.
  it("should not let an errors in res.locals show on a page with none", () => {
    const { res, originalRender } = setup("en");
    (res.locals as Record<string, unknown>).errors = { stray: "From somewhere else" };

    res.render("name", { en, cy });

    expect(originalRender.mock.calls[0][1].errors).toBeUndefined();
  });

  // Exercises the real Express res.render pipeline (not a mock) to prove keys
  // are resolved to messages in the response — the path page unit tests, which
  // stub res.render, cannot cover.
  it("should resolve keys through the real render pipeline for each locale", async () => {
    const app = express();
    app.use((req, res, next) => {
      res.locals.locale = typeof req.query.lng === "string" ? req.query.lng : "en";
      next();
    });
    app.use(translateErrors());
    // Custom View that skips filesystem lookup and serialises the errors so the
    // assertion sees exactly what reached the renderer.
    class JsonView {
      name: string;
      path = "virtual"; // truthy so Express does not treat the view as missing
      constructor(name: string) {
        this.name = name;
      }
      render(options: { errors: unknown }, cb: (err: Error | null, html: string) => void) {
        cb(null, JSON.stringify(options.errors));
      }
    }
    app.set("view", JsonView);
    app.get("/", (_req, res) => {
      res.render("view", {
        en: { errors: { firstName: "Enter your first name" } },
        cy: { errors: { firstName: "Rhowch eich enw cyntaf" } },
        errors: { firstName: "firstName" }
      });
    });

    const enResponse = await request(app).get("/");
    const cyResponse = await request(app).get("/?lng=cy");

    expect(JSON.parse(enResponse.text)).toEqual({ firstName: "Enter your first name" });
    expect(JSON.parse(cyResponse.text)).toEqual({ firstName: "Rhowch eich enw cyntaf" });
  });
});
