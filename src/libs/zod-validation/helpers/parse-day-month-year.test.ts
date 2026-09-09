import { describe, expect, it } from "vitest";
import { parseDayMonthYear } from "./parse-day-month-year.js";

const keys = { required: "dobRequired", invalid: "dobInvalid" };

describe("parseDayMonthYear", () => {
  it("should parse a valid day, month and year to a UTC date", () => {
    const result = parseDayMonthYear({ "dob-day": "14", "dob-month": "3", "dob-year": "1990" }, "dob", keys);

    expect(result).toEqual({ date: new Date(Date.UTC(1990, 2, 14)) });
  });

  it("should return the required key when all three fields are blank", () => {
    expect(parseDayMonthYear({ "dob-day": "", "dob-month": "", "dob-year": "" }, "dob", keys)).toEqual({ error: "dobRequired" });
  });

  it("should return the invalid key when only some fields are filled", () => {
    expect(parseDayMonthYear({ "dob-day": "14", "dob-month": "3" }, "dob", keys)).toEqual({ error: "dobInvalid" });
  });

  it("should return the invalid key for an out-of-range part", () => {
    expect(parseDayMonthYear({ "dob-day": "14", "dob-month": "13", "dob-year": "1990" }, "dob", keys)).toEqual({ error: "dobInvalid" });
  });

  it("should reject a calendar overflow like 31 February", () => {
    expect(parseDayMonthYear({ "dob-day": "31", "dob-month": "2", "dob-year": "1990" }, "dob", keys)).toEqual({ error: "dobInvalid" });
  });

  it("should read the field prefix so multiple dates can share a body", () => {
    const result = parseDayMonthYear({ "start-day": "1", "start-month": "9", "start-year": "2020" }, "start", keys);

    expect(result).toEqual({ date: new Date(Date.UTC(2020, 8, 1)) });
  });
});
