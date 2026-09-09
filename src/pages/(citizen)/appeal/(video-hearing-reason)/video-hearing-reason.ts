import type { Request, Response } from "express";
import { z } from "zod";
import { draftFrom, updateDraft } from "#appeal";
import { requireRole } from "#oidc";
import { fieldErrors } from "#zod-validation";
import { cy, en } from "./video-hearing-reason.i18n.js";

/**
 * Why the appellant cannot attend by video — SEND35 question 16.3.
 */
const BACK = "/appeal/video-hearing";
const NEXT = "/appeal/task-list";

const schema = z.object({
  cannotAttendByVideoReason: z.string().trim().min(1, "cannotAttendByVideoReasonRequired").max(2000, "cannotAttendByVideoReasonTooLong")
});

const getHandler = (req: Request, res: Response) => {
  const section = draftFrom(req).hearingPreferences;
  render(
    res,
    {
      cannotAttendByVideoReason: section.cannotAttendByVideoReason ?? ""
    },
    {}
  );
};

const postHandler = async (req: Request, res: Response) => {
  const parsed = schema.safeParse(req.body);
  const errors: Record<string, string> = parsed.success ? {} : fieldErrors(parsed.error);

  // The || is what narrows parsed for the store below; the length check is what lets a
  // date error and a field error be shown together rather than one page apart.
  if (!parsed.success || Object.keys(errors).length > 0) {
    return render(res, req.body, errors);
  }

  await updateDraft(req, "hearingPreferences", {
    ...parsed.data
  });
  res.redirect(302, NEXT);
};

function render(res: Response, values: Record<string, unknown>, errors: Record<string, string>): void {
  res.render("video-hearing-reason", { en, cy, values, errors, backHref: BACK });
}

export const GET = [requireRole("citizen"), getHandler];
export const POST = [requireRole("citizen"), postHandler];
