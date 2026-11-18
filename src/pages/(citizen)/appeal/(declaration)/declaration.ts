import config from "config";
import type { Request, Response } from "express";
import { z } from "zod";
import { caseDataFrom, clearDraft, draftFrom, readyToSubmit, updateDraft } from "#appeal";
import { CcdError, sharedCcdClient } from "#ccd";
import { requireRole, saveSession } from "#oidc";
import { fieldErrors, parseDayMonthYear } from "#zod-validation";
import { cy, en } from "./declaration.i18n.js";

/**
 * The declaration, and the only page that writes to CCD.
 *
 * Everything up to here is a draft in the session; this is the moment the appeal becomes
 * a case. That ordering is deliberate — an appeal somebody abandons half way through
 * should leave no case behind for a caseworker to find and wonder about.
 *
 * The completeness check is repeated here rather than trusted from check-answers. A
 * citizen can reach this URL directly, and CCD would reject an incomplete appeal with a
 * validation error naming a field, which is not a thing to show anybody.
 */
const BACK = "/appeal/check-answers";
const NEXT = "/appeal/confirmation";
const MAX_NAME = 100;

const schema = z.object({
  capacity: z.enum(["onBehalf", "youngPersonAlone"], { message: "capacityRequired" }),
  signatoryRole: z.enum(["parentOrCarer", "youngPerson", "representative"], { message: "signatoryRoleRequired" }),
  fullName: z.string().trim().min(1, "fullNameRequired").max(MAX_NAME, "fullNameTooLong"),
  signature: z.string().trim().min(1, "signatureRequired").max(MAX_NAME, "signatureTooLong")
});

const getHandler = (req: Request, res: Response) => {
  const declaration = draftFrom(req).declaration;
  render(
    res,
    {
      capacity: declaration.capacity ?? "",
      signatoryRole: declaration.signatoryRole ?? "",
      fullName: declaration.fullName ?? "",
      signature: declaration.signature ?? "",
      "dateSigned-day": declaration.dateSigned?.day ?? "",
      "dateSigned-month": declaration.dateSigned?.month ?? "",
      "dateSigned-year": declaration.dateSigned?.year ?? ""
    },
    {}
  );
};

const postHandler = async (req: Request, res: Response) => {
  const errors: Record<string, string> = {};
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    Object.assign(errors, fieldErrors(parsed.error));
  }

  const dateSigned = parseDayMonthYear(req.body, "dateSigned", { required: "dateSignedRequired", invalid: "dateSignedInvalid" });
  if (dateSigned.error) {
    errors.dateSigned = dateSigned.error;
  }

  if (Object.keys(errors).length > 0) {
    return render(res, req.body, errors);
  }

  await updateDraft(req, "declaration", {
    ...parsed.data,
    dateSigned: {
      day: String(req.body["dateSigned-day"] ?? "").trim(),
      month: String(req.body["dateSigned-month"] ?? "").trim(),
      year: String(req.body["dateSigned-year"] ?? "").trim()
    }
  });

  const draft = draftFrom(req);
  if (!readyToSubmit(draft)) {
    return res.redirect(302, "/appeal/check-answers");
  }

  const user = req.user;
  if (!user) {
    // Only reachable if the session expired between check-answers and here. Sending them
    // to sign in with a returnTo keeps the draft, which is still in the session store.
    req.session.returnTo = "/appeal/declaration";
    await saveSession(req.session);
    return res.redirect(302, "/login");
  }

  try {
    const created = await sharedCcdClient().createCase({
      caseType: caseTypeId(),
      event: createEvent(),
      data: caseDataFrom(draft),
      userToken: user.accessToken
    });

    // Kept for the confirmation page, then the draft goes: leaving it behind would let a
    // refresh of the journey submit the same appeal twice.
    req.session.submittedAppeal = {
      reference: created.reference,
      childName: [draft.childOrYoungPerson.firstName, draft.childOrYoungPerson.lastName].filter(Boolean).join(" ")
    };
    await clearDraft(req);
    res.redirect(302, NEXT);
  } catch (error) {
    if (error instanceof CcdError) {
      // Logged, because the citizen's page cannot say why and this is the only record that the
      // submission was attempted at all. Without it a failed submit leaves nothing in the pod
      // log and the investigation starts from "it just says it was not sent".
      console.error(`CCD refused the appeal (status ${error.status}): ${error.message}`);
      // The draft is untouched, so Try again resubmits exactly what they confirmed.
      return res.status(502).render("_errors/submission-failed", { title: "Your appeal was not sent", tryAgainHref: "/appeal/declaration" });
    }
    throw error;
  }
};

function render(res: Response, values: Record<string, unknown>, errors: Record<string, string>): void {
  res.render("declaration", { en, cy, values, errors, backHref: BACK });
}

// Read per call rather than at module load, so config is settled by the time it is asked.
const caseTypeId = () => config.get<string>("ccd.caseTypeId");
const createEvent = () => config.get<string>("ccd.createEvent");

export const GET = [requireRole("citizen"), getHandler];
export const POST = [requireRole("citizen"), postHandler];
