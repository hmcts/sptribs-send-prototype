// Maps a { field: key } error map to { field: message } using the page
// content's error dictionary. Values with no matching key pass through
// unchanged, so pages that already supply resolved strings are unaffected.
export function resolveErrorKeys(errors: Record<string, string>, dictionary: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(errors).map(([field, key]) => [field, dictionary[key] ?? key]));
}
