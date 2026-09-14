import type { Request, Response } from "express";
import { draftFrom, readyToSubmit, summarise } from "#appeal";
import { requireRole } from "#oidc";
import { cy, en } from "./check-answers.i18n.js";

/**
 * Check your answers.
 *
 * Rendered even when the appeal is incomplete, showing "Not answered" against the gaps
 * and hiding the button. Refusing to render it would be worse: somebody who cannot work
 * out what is missing from the task list can see it here, and seeing the whole appeal in
 * one place is how people find the section they skipped.
 *
 * The rows come from `#appeal`'s `summarise`, so the wording of an answer is decided in
 * one place and this page has no logic in it beyond "can they submit yet".
 */
const BACK = "/appeal/task-list";

const getHandler = (req: Request, res: Response) => {
  const draft = draftFrom(req);
  res.render("check-answers", {
    en,
    cy,
    sections: summarise(draft),
    ready: readyToSubmit(draft),
    backHref: BACK
  });
};

export const GET = [requireRole("citizen"), getHandler];
