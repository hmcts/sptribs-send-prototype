/**
 * A CCD (or S2S) call that did not succeed.
 *
 * One error type for the whole client, carrying the upstream status so a caller can
 * distinguish "the stack is down" from "this case type has no such event" — and
 * nothing else. In particular it carries no response body: CCD's error payloads
 * quote case data back, and a page that rendered one would leak a citizen's answers
 * into an error screen.
 */
export class CcdError extends Error {
  /** The upstream HTTP status, or 0 when the request never got a reply. */
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "CcdError";
    this.status = status;
  }
}
