import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { TASK_GROUPS } from "#appeal";
import { PAGES_ROOT } from "./__fixtures__/render-page.js";

/**
 * Where each question sends the citizen next.
 *
 * A group's questions are answered in order, and only the last one returns to the task list.
 * Returning to the hub mid-group is what made the journey feel finished when it was not: answer
 * "no" to "Another parent or carer", land back on the task list with that task Completed, and
 * the reasonable conclusion is that the section is done — while four questions in the same group
 * are still outstanding and still block submission. The hub is somewhere to see what is left and
 * come back to, not a step between every question.
 *
 * Read from the `const NEXT` / `const BACK` each page declares, because that is where the routing
 * lives: branching is a ternary over those constants in the POST handler, so the constant is the
 * straight-through destination.
 *
 * Groups containing a conditional task are exempt from the ordering assertions. Which question
 * follows which genuinely depends on the answers there — an appeal about a refusal to make a plan
 * never reaches the plan-section questions — so a fixed chain is the wrong shape and asserting one
 * would only invite the exceptions back.
 */

const APPEAL_ROOT = path.join(PAGES_ROOT, "(citizen)", "appeal");
const TASK_LIST = "/appeal/task-list";

function declared(slug: string, name: "NEXT" | "BACK"): string | undefined {
  const source = readFileSync(path.join(APPEAL_ROOT, `(${slug})`, `${slug}.ts`), "utf8");
  return source.match(new RegExp(`^const ${name} = "([^"]+)";`, "m"))?.[1];
}

/** Groups every citizen answers in the same order, so the chain is fixed and checkable. */
const unconditionalGroups = TASK_GROUPS.filter((group) => group.tasks.every((task) => task.applies === undefined));

describe("moving through a group of questions", () => {
  it("should find both kinds of group, so the exemption is not swallowing everything", () => {
    expect(unconditionalGroups.length).toBeGreaterThan(2);
    expect(unconditionalGroups.length).toBeLessThan(TASK_GROUPS.length);
  });

  it.each(unconditionalGroups.map((group) => [group.id, group] as const))("%s should not return to the hub mid-group", (_id, group) => {
    const slugs = group.tasks.map((task) => task.slug);

    for (const slug of slugs.slice(0, -1)) {
      expect(
        declared(slug, "NEXT"),
        `"${slug}" is not the last question in "${group.title}", so answering it should lead to the next question, not back to the hub`
      ).not.toBe(TASK_LIST);
    }
  });

  it.each(unconditionalGroups.map((group) => [group.id, group] as const))("%s should end by returning to the hub", (_id, group) => {
    const last = group.tasks.at(-1)?.slug;
    // `supporting-evidence` is a list the citizen adds rows to; its own page decides when done.
    if (!last || last === "supporting-evidence") {
      return;
    }
    expect(declared(last, "NEXT"), `"${last}" is the last question in "${group.title}" and must return to the hub`).toBe(TASK_LIST);
  });

  it.each(unconditionalGroups.map((group) => [group.id, group] as const))("%s should let the citizen walk back the way they came", (_id, group) => {
    const slugs = group.tasks.map((task) => task.slug);

    expect(declared(slugs[0], "BACK"), `"${slugs[0]}" is the first question in "${group.title}", so Back belongs to the hub`).toBe(TASK_LIST);

    for (const slug of slugs.slice(1)) {
      expect(declared(slug, "BACK"), `"${slug}" is mid-group, so Back should be the previous question rather than the hub`).not.toBe(TASK_LIST);
    }
  });
});
