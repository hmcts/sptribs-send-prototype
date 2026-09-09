/**
 * The seam between this service and HTTP.
 *
 * Deliberately a narrowed `fetch` rather than an interface of our own: the global
 * `fetch` satisfies it structurally, so the production path needs no adapter, and
 * a test needs no HTTP server — it passes a function.
 *
 * That matters here more than elsewhere. The local CCD stack is not always
 * running, so every rule this client enforces (which media type, which headers,
 * what a 404 from the event-trigger means) has to be provable without it.
 */
export type HttpClient = (url: string, init: HttpRequest) => Promise<HttpReply>;

export interface HttpRequest {
  method: string;
  headers: Record<string, string>;
  body?: string;
}

export interface HttpReply {
  status: number;
  ok: boolean;
  text(): Promise<string>;
}

/** The real client. Wrapped in a function so `globalThis.fetch` is read per call, not pinned at import. */
export const httpClient: HttpClient = (url, init) => fetch(url, init);
