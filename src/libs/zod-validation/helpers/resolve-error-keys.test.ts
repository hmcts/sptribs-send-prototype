import { describe, expect, it } from "vitest";
import { resolveErrorKeys } from "./resolve-error-keys.js";

describe("resolveErrorKeys", () => {
  it("should resolve keys against the content dictionary", () => {
    const errors = { firstName: "firstNameRequired", lastName: "lastNameTooLong" };
    const dictionary = { firstNameRequired: "Enter your first name", lastNameTooLong: "Last name is too long" };

    expect(resolveErrorKeys(errors, dictionary)).toEqual({
      firstName: "Enter your first name",
      lastName: "Last name is too long"
    });
  });

  it("should pass values through unchanged when no key matches", () => {
    const errors = { firstName: "Already a message" };

    expect(resolveErrorKeys(errors, { firstNameRequired: "Enter your first name" })).toEqual({
      firstName: "Already a message"
    });
  });
});
