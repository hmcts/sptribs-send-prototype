import { describe, expect, it } from "vitest";
import type { HttpClient, HttpRequest } from "./http.js";
import { s2sTokenProvider } from "./s2s-token.js";

describe("s2sTokenProvider", () => {
  it("should lease a token and return the bare JWT the endpoint sends", async () => {
    const { http, calls } = fake();

    expect(await s2sTokenProvider(http)()).toBe("s2s-jwt");
    expect(calls[0].url).toBe("http://localhost:8489/lease");
    expect(calls[0].init.method).toBe("POST");
  });

  it("should send the microservice name and a one-time password", async () => {
    const { http, calls } = fake();

    await s2sTokenProvider(http)();

    const body = JSON.parse(calls[0].init.body ?? "{}") as { microservice: string; oneTimePassword: string };
    expect(body.microservice).toBe("sptribs_case_api");
    expect(body.oneTimePassword).toMatch(/^\d{6}$/);
  });

  it("should reuse a leased token rather than minting one per submission", async () => {
    const { http, calls } = fake();
    const token = s2sTokenProvider(http, () => 1000);

    await token();
    await token();

    expect(calls).toHaveLength(1);
  });

  it("should re-lease once the cached token has aged out", async () => {
    const { http, calls } = fake();
    let now = 0;
    const token = s2sTokenProvider(http, () => now);

    await token();
    now = 2 * 60 * 60 * 1000;
    await token();

    expect(calls).toHaveLength(2);
  });

  it("should throw rather than return an empty token, so a credential problem is not mistaken for a CCD 403", async () => {
    const { http } = fake({ status: 401, body: "denied" });

    await expect(s2sTokenProvider(http)()).rejects.toMatchObject({ name: "CcdError", status: 401 });
  });

  it("should throw when the lease succeeds but hands back nothing", async () => {
    const { http } = fake({ body: "  " });

    await expect(s2sTokenProvider(http)()).rejects.toMatchObject({ name: "CcdError" });
  });
});

function fake(options: { status?: number; body?: string } = {}) {
  const calls: { url: string; init: HttpRequest }[] = [];
  const status = options.status ?? 200;

  const http: HttpClient = async (url, init) => {
    calls.push({ url, init });
    return { status, ok: status >= 200 && status < 300, text: async () => options.body ?? "s2s-jwt" };
  };

  return { http, calls };
}
