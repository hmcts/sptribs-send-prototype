import * as client from "openid-client";
import { describe, expect, it } from "vitest";
import { assertedIssuer, setupOidcClient } from "./client.js";

/**
 * The local IDAM simulator's issuer, and agreeing with it.
 *
 * openid-client v6 validates the `iss` claim on every token against the issuer from
 * discovery, and rejects any difference as `ClientError: invalid response encountered`
 * — a 500 on `/oauth2-callback` and no local sign-in.
 *
 * The simulator has served both shapes: older images advertised `…:5062/o` while signing
 * the bare origin, current ones sign `/o` too. The first version of this code stripped a
 * trailing `/o` unconditionally and so began *causing* the mismatch when the image was
 * updated — which is why the expectation is now read from the server instead.
 *
 * These pin that behaviour: ask, do not assume; and stay confined to the local
 * simulator.
 */
describe("assertedIssuer", () => {
  it("should report the iss claim from a token the simulator mints", async (ctx) => {
    if (!(await simulatorReachable())) {
      ctx.skip();
      return;
    }

    const asserted = await assertedIssuer(new URL("http://localhost:5062/o"), "sptribs-send-prototype", "sptribs-send-prototype-idam-secret");

    // Read from the server, not derived from the configured URL. Which of the two
    // shapes the current image signs is deliberately NOT asserted — that is the thing
    // that changed under us and the reason this is a probe rather than a transform.
    expect(asserted).toMatch(/^http:\/\/localhost:5062(\/o)?$/);
    expect(asserted).toBe(await simulatorTokenIssuer());
  });

  it("should give up quietly when there is no simulator to ask", async () => {
    // A closed port, so the fetch rejects. Returning undefined leaves the discovered
    // issuer in place; a sign-in that then fails reports the true mismatch, which beats
    // a guess that silently sends the wrong expectation into the token check.
    const asserted = await assertedIssuer(new URL("http://localhost:1/o"), "sptribs-send-prototype", "secret");

    expect(asserted).toBeUndefined();
  });
});

describe("setupOidcClient against the local simulator", () => {
  it("should build a config whose issuer matches the id_token's iss claim", async (ctx) => {
    const reachable = await simulatorReachable();
    if (!reachable) {
      ctx.skip();
      return;
    }

    const config = await setupOidcClient();
    const metadata = config.serverMetadata();

    // The property that matters is *agreement*, not either particular value: whatever
    // the simulator signs is what openid-client must validate against. Asserting a
    // literal here is what made this suite pass while the app was broken.
    expect(metadata.issuer).toBe(await simulatorTokenIssuer());
  });

  it("should keep every discovered endpoint, because they are absolute URLs", async (ctx) => {
    const reachable = await simulatorReachable();
    if (!reachable) {
      ctx.skip();
      return;
    }

    const metadata = (await setupOidcClient()).serverMetadata();

    // Rebuilding the metadata must not move the endpoints — only the issuer the
    // claim is compared against. They stay under /o.
    expect(metadata.token_endpoint).toBe("http://localhost:5062/o/token");
    expect(metadata.jwks_uri).toBe("http://localhost:5062/o/jwks");
    expect(metadata.authorization_endpoint).toBe("http://localhost:5062/o/authorize");
    expect(metadata.userinfo_endpoint).toBe("http://localhost:5062/o/userinfo");
  });

  it("should still allow insecure requests, since the rebuilt config is a new one", async (ctx) => {
    const reachable = await simulatorReachable();
    if (!reachable) {
      ctx.skip();
      return;
    }

    // `allowInsecureRequests` is applied to the *discovered* config by the discovery
    // options; the rebuilt one needs it again or every plain-http call fails. Proven
    // by a real userinfo-less call: fetching the JWKS through the config's own fetch.
    const config = await setupOidcClient();
    await expect(client.fetchUserInfo(config, "not-a-token", "sub")).rejects.not.toThrow(/insecure|https/i);
  });
});

const simulatorReachable = () =>
  fetch("http://localhost:5062/o/.well-known/openid-configuration")
    .then((r) => r.ok)
    .catch(() => false);

/** The `iss` the simulator actually mints, read out of a real id_token. */
async function simulatorTokenIssuer(): Promise<string> {
  const jar = new Map<string, string>();
  const cookies = () => [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
  const absorb = (r: Response) => {
    for (const raw of r.headers.getSetCookie?.() ?? []) {
      const [pair] = raw.split(";");
      const at = pair.indexOf("=");
      jar.set(pair.slice(0, at), pair.slice(at + 1));
    }
  };

  const redirectUri = "http://localhost:3210/oauth2-callback";
  const authorize = `http://localhost:5062/o/authorize?redirect_uri=${encodeURIComponent(redirectUri)}&scope=openid+profile+roles&client_id=sptribs-send-prototype&response_type=code&nonce=test-nonce`;

  let reply = await fetch(authorize, { redirect: "manual" });
  absorb(reply);
  reply = await fetch(new URL(reply.headers.get("location")!, "http://localhost:5062").href, { redirect: "manual", headers: { cookie: cookies() } });
  absorb(reply);
  const loginForm = await reply.text();
  const action = loginForm.match(/action="([^"]+)"/)![1].replaceAll("&amp;", "&");

  reply = await fetch(new URL(action, "http://localhost:5062").href, {
    method: "POST",
    redirect: "manual",
    headers: { cookie: cookies(), "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username: "citizen@dev.local", password: "password", save: "" })
  });
  const code = new URL(reply.headers.get("location")!, "http://localhost:3210").searchParams.get("code")!;

  const tokens = await fetch("http://localhost:5062/o/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: "sptribs-send-prototype",
      client_secret: "sptribs-send-prototype-idam-secret"
    })
  });
  const { id_token } = (await tokens.json()) as { id_token: string };
  const payload = JSON.parse(Buffer.from(id_token.split(".")[1], "base64url").toString()) as { iss: string };
  return payload.iss;
}
