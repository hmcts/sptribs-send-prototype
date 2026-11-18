import type { ZodError } from "zod";

/**
 * Flatten a ZodError into a `{ field: message }` map.
 *
 * The key is the issue's whole path, camel-joined: a top-level `firstName` stays
 * `firstName`, and a nested `address.postcode` becomes `addressPostcode`. That matters for
 * the composite questions — an address is one question with several inputs, and each input
 * needs its own message next to it. Keying on the first path segment alone would collapse
 * all five of an address's messages onto the fieldset, so "Enter the postcode" would appear
 * under "Address line 1".
 *
 * The values are content keys, not messages: a schema writes
 * `.min(1, "postcodeRequired")` and `translateErrors` resolves the key against the page's
 * content at render time.
 */
export function fieldErrors(error: ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = fieldKey(issue.path);
    // First issue wins: a field that is both blank and too long has one thing wrong with
    // it as far as the citizen is concerned.
    if (!(field in errors)) {
      errors[field] = issue.message;
    }
  }
  return errors;
}

/** `["address", "postcode"]` → `addressPostcode`. Array indices are dropped. */
function fieldKey(path: readonly (string | number | symbol)[]): string {
  const segments = path.filter((segment): segment is string => typeof segment === "string");
  return segments.map((segment, at) => (at === 0 ? segment : segment.charAt(0).toUpperCase() + segment.slice(1))).join("");
}

// The first issue's message (a content key) for a single-field schema, or
// `fallback` if the error somehow carries no issues.
export function singleFieldError(error: ZodError, fallback = "required"): string {
  return error.issues[0]?.message ?? fallback;
}
