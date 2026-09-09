import config from "config";
import { CcdError } from "./ccd-error.js";
import { type HttpClient, httpClient } from "./http.js";
import { type S2sTokenProvider, s2sTokenProvider } from "./s2s-token.js";

/**
 * The CCD data-store calls this service makes. Two.
 *
 * Narrow on purpose. Everything the citizen journey needs from CCD is "lodge this
 * appeal and tell me its reference", plus reading one back so the prototype can
 * prove the round trip. An interface that says only that can be faked in a line —
 * which is what lets the submission path be tested while the local CCD stack is down.
 */
export interface CcdClient {
  createCase(request: CreateCaseRequest): Promise<CreatedCase>;
  fetchCase(request: FetchCaseRequest): Promise<FetchedCase>;
}

export interface FetchCaseRequest {
  /** CCD's numeric case id, digits only. */
  caseId: string;
  userToken: string;
}

export interface FetchedCase {
  id: string;
  reference: string;
  state?: string;
  data: Record<string, unknown>;
}

export interface CreateCaseRequest {
  /** CCD case type id, from the form definition. */
  caseType: string;
  /** The `CaseEvent` id that creates a case of this type. */
  event: string;
  /** Field values keyed by question id — see `caseDataFrom`. */
  data: Record<string, unknown>;
  /** The citizen's IDAM bearer token, from `req.user.accessToken`. */
  userToken: string;
}

export interface CreatedCase {
  /** CCD's numeric case id, as a string — 16 digits, beyond a JS number. */
  id: string;
  /** The 16-digit reference formatted in groups of four, as it is shown to citizens. */
  reference: string;
  state?: string;
}

/**
 * A client over the standard two-step create lifecycle:
 *
 *   1. `GET /case-types/{caseType}/event-triggers/{event}` for a one-shot event token;
 *   2. `POST /case-types/{caseType}/cases` with that token and the case data.
 *
 * The token is what makes step 2 idempotent-ish — CCD rejects a reused one — so it
 * is fetched per submission and never cached. That is the opposite decision to the
 * S2S token, and for the opposite reason.
 *
 * Both `http` and `s2sToken` are injected. In production they are the real ones;
 * in tests they are functions, which is the whole point.
 */
export function ccdClient(http: HttpClient = httpClient, s2sToken: S2sTokenProvider = s2sTokenProvider(http)): CcdClient {
  return {
    async createCase({ caseType, event, data, userToken }) {
      const s2s = await s2sToken();

      const trigger = await send(http, `${dataStoreUrl()}/case-types/${encodeURIComponent(caseType)}/event-triggers/${encodeURIComponent(event)}`, {
        method: "GET",
        headers: requestHeaders(userToken, s2s, START_TRIGGER_MEDIA_TYPE)
      });
      const eventToken = asString(trigger.token);
      if (!eventToken) {
        throw new CcdError(`CCD returned no event token for ${caseType}/${event}`, 502);
      }

      const created = await send(http, `${dataStoreUrl()}/case-types/${encodeURIComponent(caseType)}/cases`, {
        method: "POST",
        headers: { ...requestHeaders(userToken, s2s, CREATE_CASE_MEDIA_TYPE), "content-type": "application/json" },
        body: JSON.stringify({ data, event: { id: event }, event_token: eventToken, ignore_warning: false })
      });

      const id = asString(created.id);
      if (!id) {
        throw new CcdError("CCD created a case but returned no id", 502);
      }
      return { id, reference: formatCaseReference(id), state: asString(created.state) };
    },

    async fetchCase({ caseId, userToken }) {
      const s2s = await s2sToken();

      const found = await send(http, `${dataStoreUrl()}/cases/${encodeURIComponent(caseId)}`, {
        method: "GET",
        headers: requestHeaders(userToken, s2s, CASE_MEDIA_TYPE)
      });

      const id = asString(found.id);
      if (!id) {
        throw new CcdError(`CCD returned no case for ${caseId}`, 502);
      }
      const data = found.data && typeof found.data === "object" ? (found.data as Record<string, unknown>) : {};
      return { id, reference: formatCaseReference(id), state: asString(found.state), data };
    }
  };
}

/**
 * The client the pages use.
 *
 * A single lazily-built instance, because the S2S token cache lives inside the
 * provider it closes over — a client built per request would re-mint a lease on
 * every submission and the cache would never be read. Built on first use rather than
 * at import so `config` is settled by then.
 */
export function sharedCcdClient(): CcdClient {
  shared ??= ccdClient();
  return shared;
}

let shared: CcdClient | undefined;

/**
 * `1234567890123456` → `1234 5678 9012 3456`.
 *
 * Grouped for the same reason a bank account number is: a citizen has to read this
 * off a screen and quote it on the phone. Anything that is not a 16-digit id is
 * shown as CCD gave it, rather than mangled into groups that mean nothing.
 */
export function formatCaseReference(id: string): string {
  return /^\d{16}$/.test(id) ? (id.match(/.{4}/g) ?? [id]).join(" ") : id;
}

/**
 * The headers a data-store call needs.
 *
 * `experimental: true` is not optional — the `/case-types/...` endpoints used here are
 * the v2 external API, and CCD refuses them without it.
 *
 * `accept` must name the **exact** media type for the endpoint being called, and the
 * two calls in a create do not share one. Sending a list, or the create-case type on
 * the event-trigger call, gets a 406 quoting the one representation it will produce:
 *
 *     Acceptable representations:
 *       [application/vnd.uk.gov.hmcts.ccd-data-store-api.start-case-trigger.v2+json…]
 *
 * Found only by calling real CCD — every faked HTTP layer happily accepted the wrong
 * header, so the media types are now asserted in the unit tests too.
 */
function requestHeaders(userToken: string, s2sToken: string, accept: string): Record<string, string> {
  return {
    authorization: `Bearer ${userToken}`,
    serviceauthorization: s2sToken,
    experimental: "true",
    accept
  };
}

/** `GET /case-types/{ct}/event-triggers/{id}` produces only this. */
const START_TRIGGER_MEDIA_TYPE = "application/vnd.uk.gov.hmcts.ccd-data-store-api.start-case-trigger.v2+json;charset=UTF-8";

/** `POST /case-types/{ct}/cases` produces only this. */
const CREATE_CASE_MEDIA_TYPE = "application/vnd.uk.gov.hmcts.ccd-data-store-api.create-case.v2+json;charset=UTF-8";

/** `GET /cases/{caseId}` produces only this. */
const CASE_MEDIA_TYPE = "application/vnd.uk.gov.hmcts.ccd-data-store-api.external.case-view.v2+json;charset=UTF-8";

/**
 * One call, with the reply parsed and every failure turned into a `CcdError`.
 *
 * A network-level failure (nothing listening on :4452 — the normal state while the
 * local stack is being rebuilt) becomes status 0, so a caller can tell "CCD said
 * no" from "CCD was not there" and the page can word the two differently.
 *
 * The upstream body is never attached to the error. CCD echoes case data back in
 * validation failures, and an error page rendering that would leak the citizen's
 * answers.
 */
async function send(http: HttpClient, url: string, init: Parameters<HttpClient>[1]): Promise<Record<string, unknown>> {
  let reply: Awaited<ReturnType<HttpClient>>;
  try {
    reply = await http(url, init);
  } catch {
    throw new CcdError(`CCD is not reachable at ${url}`, 0);
  }

  const text = await reply.text();
  if (!reply.ok) {
    throw new CcdError(`CCD responded ${reply.status} to ${init.method} ${url}`, reply.status);
  }

  if (!text.trim()) {
    return {};
  }
  try {
    const parsed = JSON.parse(text) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    throw new CcdError(`CCD returned a non-JSON body from ${url}`, reply.status);
  }
}

const dataStoreUrl = () => config.get<string>("ccd.dataStoreUrl").replace(/\/$/, "");

/** CCD returns ids as numbers or strings depending on the endpoint; normalise once. */
function asString(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }
  return typeof value === "number" ? String(value) : undefined;
}
