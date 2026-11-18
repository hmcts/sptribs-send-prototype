import { describe, expect, it } from "vitest";
import { parseMonthYear } from "./parse-month-year.js";

const keys = { required: "fromRequired", invalid: "fromInvalid" };

describe("parseMonthYear", () => {
  it("should parse a valid month and year to the first of the UTC month", () => {
    const result = parseMonthYear({ "from-month": "3", "from-year": "2018" }, "from", keys);

    expect(result).toEqual({ date: new Date(Date.UTC(2018, 2, 1)) });
  });

  it("should return the required key when both fields are blank", () => {
    expect(parseMonthYear({ "from-month": "", "from-year": "" }, "from", keys)).toEqual({ error: "fromRequired" });
  });

  it("should return the invalid key when only one field is filled", () => {
    expect(parseMonthYear({ "from-month": "3" }, "from", keys)).toEqual({ error: "fromInvalid" });
  });

  it("should return the invalid key for an out-of-range month", () => {
    expect(parseMonthYear({ "from-month": "13", "from-year": "2018" }, "from", keys)).toEqual({ error: "fromInvalid" });
  });

  it("should read the field prefix so multiple dates can share a body", () => {
    const result = parseMonthYear({ "to-month": "9", "to-year": "2020" }, "to", keys);

    expect(result).toEqual({ date: new Date(Date.UTC(2020, 8, 1)) });
  });
});
