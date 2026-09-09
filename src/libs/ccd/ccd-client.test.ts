import { describe, expect, it } from "vitest";
import { ccdClient, formatCaseReference } from "./ccd-client.js";
import { CcdError } from "./ccd-error.js";
import type { HttpClient, HttpRequest } from "./http.js";

/**
 * The client against a faked HTTP layer.
 *
 * The local CCD stack is not always up, and the rules this client has to get right
 * — which endpoints, in what order, with which headers, and what happens when one
 * of them fails — are all decidable without it. Every one of them is asserted here.
 */
describe("ccdClient.createCase", () => {
  it("should fetch an event token then post the case", async () => {
    const { client, calls } = build();

    const created = await client.createCase({ caseType: "Leasehold3", event: "create-case", data: { a: "1" }, userToken: "user-jwt" });

    expect(calls.map((call) => `${call.init.method} ${call.url}`)).toEqual([
      "GET http://localhost:4452/case-types/Leasehold3/event-triggers/create-case",
      "POST http://localhost:4452/case-types/Leasehold3/cases"
    ]);
    expect(created).toEqual({ id: "1234567890123456", reference: "1234 5678 9012 3456", state: "Draft" });
  });

  it("should send the event token it was given back on the create call", async () => {
    const { client, calls } = build();

    await client.createCase({ caseType: "Leasehold3", event: "create-case", data: { a: "1" }, userToken: "user-jwt" });

    expect(JSON.parse(calls[1].init.body ?? "{}")).toEqual({
      data: { a: "1" },
      event: { id: "create-case" },
      event_token: "event-token-abc",
      ignore_warning: false
    });
  });

  it("should carry the citizen's bearer token, an S2S token and the experimental header", async () => {
    const { client, calls } = build();

    await client.createCase({ caseType: "Leasehold3", event: "create-case", data: {}, userToken: "user-jwt" });

    for (const call of calls) {
      expect(call.init.headers.authorization).toBe("Bearer user-jwt");
      expect(call.init.headers.serviceauthorization).toBe("s2s-jwt");
      // Without this the v2 external endpoints refuse the request.
      expect(call.init.headers.experimental).toBe("true");
    }
  });

  it("should accept the exact media type each endpoint produces, which is not the same one", async () => {
    // Real CCD answers 406 to anything else — including a comma-separated list, and
    // including the create-case type on the event-trigger call. A faked HTTP layer
    // accepts whatever it is sent, so this is pinned here or it is not covered at all.
    const { client, calls } = build();

    await client.createCase(aRequest());

    expect(calls[0].init.headers.accept).toBe("application/vnd.uk.gov.hmcts.ccd-data-store-api.start-case-trigger.v2+json;charset=UTF-8");
    expect(calls[1].init.headers.accept).toBe("application/vnd.uk.gov.hmcts.ccd-data-store-api.create-case.v2+json;charset=UTF-8");
  });

  it("should not send a comma-separated accept list, which CCD rejects", async () => {
    const { client, calls } = build();

    await client.createCase(aRequest());

    for (const call of calls) {
      expect(call.init.headers.accept).not.toContain(",");
    }
  });

  it("should format the case reference in groups of four", () => {
    expect(formatCaseReference("1234567890123456")).toBe("1234 5678 9012 3456");
  });

  it("should leave an unexpected id shape alone rather than mangling it", () => {
    expect(formatCaseReference("abc")).toBe("abc");
  });

  it("should accept a numeric id, which is how the data store actually sends it", async () => {
    const { client } = build({ createBody: JSON.stringify({ id: 1234567890123456, state: "Draft" }) });

    expect((await client.createCase(aRequest())).reference).toBe("1234 5678 9012 3456");
  });

  it("should fail with the upstream status when the event trigger is rejected", async () => {
    const { client } = build({ triggerStatus: 404 });

    await expect(client.createCase(aRequest())).rejects.toMatchObject({ name: "CcdError", status: 404 });
  });

  it("should fail with the upstream status when case creation is rejected", async () => {
    const { client } = build({ createStatus: 422 });

    await expect(client.createCase(aRequest())).rejects.toMatchObject({ name: "CcdError", status: 422 });
  });

  it("should report status 0 when nothing is listening, so a caller can tell that from a rejection", async () => {
    const client = ccdClient(
      () => Promise.reject(new Error("ECONNREFUSED")),
      async () => "s2s-jwt"
    );

    await expect(client.createCase(aRequest())).rejects.toMatchObject({ status: 0 });
  });

  it("should never put the upstream body in the error, because CCD echoes case data back", async () => {
    const secret = "applicantFirstName was Alex";
    const { client } = build({ createStatus: 422, createBody: JSON.stringify({ message: secret }) });

    const error = await client.createCase(aRequest()).catch((e: CcdError) => e);

    expect(error).toBeInstanceOf(CcdError);
    expect((error as CcdError).message).not.toContain(secret);
  });

  it("should refuse to post without an event token rather than sending an unauthenticated create", async () => {
    const { client, calls } = build({ triggerBody: JSON.stringify({}) });

    await expect(client.createCase(aRequest())).rejects.toMatchObject({ name: "CcdError" });
    expect(calls).toHaveLength(1);
  });

  it("should fail when a created case comes back without an id", async () => {
    const { client } = build({ createBody: JSON.stringify({ state: "Draft" }) });

    await expect(client.createCase(aRequest())).rejects.toMatchObject({ name: "CcdError", status: 502 });
  });

  it("should fail on a non-JSON body rather than silently returning nothing", async () => {
    const { client } = build({ createBody: "<html>gateway timeout</html>" });

    await expect(client.createCase(aRequest())).rejects.toMatchObject({ name: "CcdError" });
  });

  it("should not call CCD at all when the S2S token cannot be minted", async () => {
    const { calls, http } = recorder();
    const client = ccdClient(http, () => Promise.reject(new CcdError("s2s lease failed with 401", 401)));

    await expect(client.createCase(aRequest())).rejects.toMatchObject({ status: 401 });
    expect(calls).toEqual([]);
  });
});

const aRequest = () => ({ caseType: "Leasehold3", event: "create-case", data: {}, userToken: "user-jwt" });

interface FakeOptions {
  triggerStatus?: number;
  triggerBody?: string;
  createStatus?: number;
  createBody?: string;
}

function build(options: FakeOptions = {}) {
  const { calls, http } = recorder(options);
  return { client: ccdClient(http, async () => "s2s-jwt"), calls, http };
}

/** Records every request and answers per the options, so order and payloads are assertable. */
function recorder(options: FakeOptions = {}) {
  const calls: { url: string; init: HttpRequest }[] = [];

  const http: HttpClient = async (url, init) => {
    calls.push({ url, init });
    const isTrigger = url.includes("/event-triggers/");
    const status = (isTrigger ? options.triggerStatus : options.createStatus) ?? (isTrigger ? 200 : 201);
    const body =
      (isTrigger ? options.triggerBody : options.createBody) ??
      (isTrigger ? JSON.stringify({ token: "event-token-abc" }) : JSON.stringify({ id: "1234567890123456", state: "Draft" }));

    return { status, ok: status >= 200 && status < 300, text: async () => body };
  };

  return { calls, http };
}
