import type { Request, Response } from "express";
import { completedCount, draftFrom, readyToSubmit, TASK_GROUPS } from "#appeal";
import { requireRole } from "#oidc";
import { cy, en } from "./task-list.i18n.js";

/**
 * The hub.
 *
 * A component over the section manifest, not a step in the journey: it reads
 * `TASK_GROUPS` and asks each task whether it applies and whether it is done. Adding a
 * question therefore changes one entry in `#appeal`'s manifest and nothing here.
 *
 * Tasks that do not apply to this appeal are dropped rather than greyed out. SEND35
 * branches hard — a refusal to make a plan never reaches the plan-section questions —
 * and showing somebody a task they must not answer is worse than not showing it.
 */
const getHandler = (req: Request, res: Response) => {
  const draft = draftFrom(req);
  const { done, total } = completedCount(draft);

  const groups = TASK_GROUPS.map((group) => ({
    id: group.id,
    title: group.title,
    tasks: group.tasks
      .filter((task) => task.applies?.(draft) ?? true)
      .map((task) => ({
        title: task.title,
        href: `/appeal/${task.slug}`,
        complete: task.complete(draft)
      }))
  })).filter((group) => group.tasks.length > 0);

  res.render("task-list", { en, cy, groups, done, total, ready: readyToSubmit(draft) });
};

export const GET = [requireRole("citizen"), getHandler];
