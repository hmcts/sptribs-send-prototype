import { describe, expect, it } from "vitest";
import { needsLateExplanation, timeLimit } from "./deadline.js";
import { emptyDraft } from "./types.js";

const on = (day: string, month: string, year: string) => ({ day, month, year });

function draftWith(dates: {
  decisionLetterDate?: { day: string; month: string; year: string };
  mediationCertificateDate?: { day: string; month: string; year: string };
}) {
  const draft = emptyDraft();
  draft.timeliness = dates;
  return draft;
}

describe("timeLimit", () => {
  it("should say nothing until a date has been given", () => {
    expect(timeLimit(emptyDraft())).toEqual({ outOfTime: false });
  });

  it("should be two months from the decision letter", () => {
    const limit = timeLimit(draftWith({ decisionLetterDate: on("1", "2", "2026") }), new Date(2026, 2, 1));

    expect(limit.deadline).toBe("2026-04-01");
    expect(limit.outOfTime).toBe(false);
  });

  it("should be out of time the day after the deadline", () => {
    expect(timeLimit(draftWith({ decisionLetterDate: on("1", "2", "2026") }), new Date(2026, 3, 2)).outOfTime).toBe(true);
  });

  it("should still be in time on the deadline itself", () => {
    expect(timeLimit(draftWith({ decisionLetterDate: on("1", "2", "2026") }), new Date(2026, 3, 1)).outOfTime).toBe(false);
  });

  it("should clamp to the end of the month rather than overflowing into the next one", () => {
    // 31 December plus two months is the end of February, not 3 March. Somebody counting
    // two months from New Year's Eve does not arrive in March.
    expect(timeLimit(draftWith({ decisionLetterDate: on("31", "12", "2025") }), new Date(2026, 0, 1)).deadline).toBe("2026-02-28");
  });

  it("should give the later of the two deadlines when there is a mediation certificate", () => {
    // Decision letter 1 February gives 1 April; a certificate dated 20 March gives
    // 20 April. The one-month mediation window exists to give time after mediation, not
    // to shorten the two months.
    const limit = timeLimit(draftWith({ decisionLetterDate: on("1", "2", "2026"), mediationCertificateDate: on("20", "3", "2026") }), new Date(2026, 3, 10));

    expect(limit.deadline).toBe("2026-04-20");
    expect(limit.outOfTime).toBe(false);
  });

  it("should use the decision letter when it gives the later deadline", () => {
    const limit = timeLimit(draftWith({ decisionLetterDate: on("1", "3", "2026"), mediationCertificateDate: on("2", "3", "2026") }), new Date(2026, 3, 10));

    expect(limit.deadline).toBe("2026-05-01");
  });

  it("should work from the certificate alone if that is all there is", () => {
    expect(timeLimit(draftWith({ mediationCertificateDate: on("20", "3", "2026") }), new Date(2026, 3, 10)).deadline).toBe("2026-04-20");
  });

  it("should ignore a half-typed date", () => {
    expect(timeLimit(draftWith({ decisionLetterDate: { day: "1", month: "", year: "2026" } })).deadline).toBeUndefined();
  });
});

describe("needsLateExplanation", () => {
  it("should be asked for only when the appeal is out of time", () => {
    const draft = draftWith({ decisionLetterDate: on("1", "1", "2026") });

    expect(needsLateExplanation(draft, new Date(2026, 1, 1))).toBe(false);
    expect(needsLateExplanation(draft, new Date(2026, 5, 1))).toBe(true);
  });
});
