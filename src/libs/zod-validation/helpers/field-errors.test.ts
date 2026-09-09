import { describe, expect, it } from "vitest";
import { z } from "zod";
import { fieldErrors, singleFieldError } from "./field-errors.js";

describe("fieldErrors", () => {
  it("should map each field to its first-path key message", () => {
    const schema = z.object({
      firstName: z.string().min(1, "firstNameRequired"),
      lastName: z.string().min(1, "lastNameRequired")
    });

    const result = schema.safeParse({ firstName: "", lastName: "" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(fieldErrors(result.error)).toEqual({ firstName: "firstNameRequired", lastName: "lastNameRequired" });
    }
  });

  it("should keep the first issue when a field has multiple", () => {
    const schema = z.object({ value: z.string().min(1, "required").max(3, "tooLong") });

    const result = schema.safeParse({ value: "" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(fieldErrors(result.error)).toEqual({ value: "required" });
    }
  });
});

describe("singleFieldError", () => {
  it("should return the first issue's message key", () => {
    const schema = z.object({ statement: z.string().min(10, "tooShort") });

    const result = schema.safeParse({ statement: "short" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(singleFieldError(result.error)).toBe("tooShort");
    }
  });
});

describe("fieldErrors with a composite question", () => {
  it("should key a nested field on its whole path", () => {
    // An address is one question with five inputs. Keying on "address" alone would put
    // "Enter the postcode" under Address line 1.
    const schema = z.object({
      address: z.object({
        addressLine1: z.string().min(1, "addressAddressLine1Required"),
        postcode: z.string().min(1, "addressPostcodeRequired")
      })
    });

    const result = schema.safeParse({ address: { addressLine1: "", postcode: "" } });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(fieldErrors(result.error)).toEqual({
        addressAddressLine1: "addressAddressLine1Required",
        addressPostcode: "addressPostcodeRequired"
      });
    }
  });

  it("should drop array indices, because a collection error belongs to the collection", () => {
    const schema = z.object({ items: z.array(z.string().min(1, "itemRequired")) });

    const result = schema.safeParse({ items: [""] });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(fieldErrors(result.error)).toEqual({ items: "itemRequired" });
    }
  });
});
