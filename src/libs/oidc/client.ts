import config from "config";
import * as client from "openid-client";

/**
 * Named so it is obvious in the simulator's logs why a token was minted at boot, and
 * distinct from the seeded accounts so it cannot be mistaken for a real test user.
 */
const ISSUER_PROBE_USER = "issuer-probe@send.local";

// Stub identities seeded into the local IDAM simulator so there is something to
// sign in as. The role names mirror sptribs-case-api's CftLibConfig so the same
// accounts work against the cftlib CCD stack. `caseworker*` → caseworker,
// `citizen` → citizen (see deriveUserType).
const SIMULATOR_USERS = [
  { email: "citizen@dev.local", forename: "Alex", surname: "Citizen", password: "password", roles: [{ code: "citizen" }] },
  {
    email: "caseworker@dev.local",
    forename: "Casey",
    surname: "Worker",
    password: "password",
    roles: [{ code: "caseworker-st_cic-caseworker" }, { code: "caseworker-st_cic" }, { code: "caseworker" }]
  },
  // No roles: this account exists only so the issuer probe below has something to mint a
  // token for. It can sign into nothing.
  { email: ISSUER_PROBE_USER, forename: "Issuer", surname: "Probe", password: "probe", roles: [] }
];

let clientConfig: client.Configuration | undefined;

/**
 * Initialise the OIDC client against the configured IDAM issuer
 * (`config.idam.issuer`). Called once at app boot from `createApp()`.
 * When the issuer points at the local IDAM simulator, seed the stub
 * identities via /testing-support/accounts so the login flow has users
 * to authenticate.
 */
export async function setupOidcClient(): Promise<client.Configuration> {
  if (clientConfig) {
    return clientConfig;
  }

  const issuer = new URL(config.get<string>("idam.issuer"));
  const clientId = config.get<string>("idam.clientId");
  const clientSecret = config.get<string>("idam.clientSecret");

  // The simulator runs over plain http; openid-client refuses non-https
  // discovery by default. Detect it by protocol rather than a specific
  // hostname — locally the discovered issuer can be `localhost` or
  // `idam-simulator` depending on how the simulator resolves the caller.
  const isLocalSimulator = issuer.protocol === "http:";
  const discoveryOptions = isLocalSimulator ? { execute: [client.allowInsecureRequests] } : undefined;

  const discovered = await client.discovery(issuer, clientId, clientSecret, undefined, discoveryOptions);

  if (isLocalSimulator) {
    // Seeded first: the issuer probe mints a token, which the simulator will only do
    // once it has users to mint against.
    await seedSimulatorUsers(issuer);
  }

  clientConfig = await reconcileIssuer(discovered, issuer, clientId, clientSecret, isLocalSimulator);

  return clientConfig;
}

/**
 * Reconcile the issuer IDAM *advertises* with the one it actually *signs*.
 *
 * openid-client v6 checks the `iss` claim on every token against the issuer from the
 * discovery document, and rejects any difference — which surfaces as a 500 on
 * `/oauth2-callback` and makes sign-in impossible.
 *
 * **Real IDAM disagrees with itself.** AAT advertises
 * `https://idam-web-public.aat.platform.hmcts.net/o` and signs
 * `https://forgerock-am.service.core-compute-idam-aat2.internal:8443/openam/oauth2/realms/root/realms/hmcts`
 * — its internal ForgeRock hostname, which is not reachable from outside the cluster and
 * cannot be configured as the issuer. Every AAT sign-in fails the check. `aud` and `azp`
 * are both correct; the issuer is the only claim that disagrees.
 *
 * The simulator disagrees too, for its own reason: two settings control the two values
 * independently (`SIMULATOR_OPENID_BASE-URL` for discovery, `SIMULATOR_JWT_ISSUER` for the
 * claim), and different images have signed `/o` and the bare origin.
 *
 * So rather than special-case either, this asks the server directly: mint a token and read
 * its `iss`. That is the value being validated, so it is the one to expect — and it cannot go
 * stale the way a hardcoded transform did. (An earlier version stripped a trailing `/o`
 * unconditionally and began *causing* the mismatch when the simulator image changed.)
 *
 * **What this is not:** it does not skip the issuer check, and it does not accept whatever an
 * id_token claims. The check still happens, on every token, against a value read once at boot
 * from the token endpoint — reached over HTTPS at the configured issuer, authenticated with
 * the client secret. A token from any other issuer is still rejected. What it removes is the
 * assumption that a server advertises the same string it signs, which HMCTS IDAM does not.
 *
 * If the probe cannot mint a token the discovered issuer stands, so a misconfiguration still
 * fails loudly rather than silently accepting anything.
 */
async function reconcileIssuer(
  discovered: client.Configuration,
  issuer: URL,
  clientId: string,
  clientSecret: string,
  isLocalSimulator: boolean
): Promise<client.Configuration> {
  // `serverMetadata()` returns the document plus a `supportsPKCE()` helper. Spreading
  // takes the helper along, which is not valid metadata, so it is dropped by name —
  // the rest of the document is carried over untouched.
  const { supportsPKCE: _supportsPKCE, ...metadata } = discovered.serverMetadata();
  const asserted = await assertedIssuer(issuer, clientId, clientSecret);
  if (!asserted || asserted === metadata.issuer) {
    return discovered;
  }

  console.log(`IDAM signs a different issuer than it advertises; expecting "${asserted}" rather than "${metadata.issuer}"`);

  const reconciled = new client.Configuration({ ...metadata, issuer: asserted }, clientId, clientSecret);
  if (isLocalSimulator) {
    // Re-applied because this is a new Configuration, not the discovered one: the
    // simulator is plain http and openid-client refuses insecure requests by default.
    client.allowInsecureRequests(reconciled);
  }
  return reconciled;
}

/**
 * The `iss` the server actually signs, read from a token it mints.
 *
 * Two grants are tried, because the two IDAMs answer to different ones and neither works
 * everywhere:
 *
 * - **client_credentials** works on real IDAM and needs no user account, which is what makes
 *   this safe to do at boot. It must ask for a scope other than `openid` — IDAM answers
 *   "Client_credentials does not support openid scope" — and the `iss` on the resulting access
 *   token is the same one id_tokens carry.
 * - **password**, against a throwaway account, is the simulator's path: it mints a token for
 *   any username and does not implement client_credentials.
 *
 * Returns undefined if both fail, in which case the discovered issuer stands and a sign-in
 * that then fails reports the real mismatch — better than a guess.
 */
export async function assertedIssuer(issuer: URL, clientId: string, clientSecret: string): Promise<string | undefined> {
  const tokenUrl = `${issuer.href.replace(/\/o\/?$/, "")}/o/token`;

  const grants: Record<string, string>[] = [
    { grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret, scope: "profile" },
    {
      grant_type: "password",
      client_id: clientId,
      client_secret: clientSecret,
      username: ISSUER_PROBE_USER,
      password: "probe",
      scope: "openid profile roles"
    }
  ];

  for (const grant of grants) {
    const asserted = await issuerFromGrant(tokenUrl, grant);
    if (asserted) {
      return asserted;
    }
  }
  return undefined;
}

async function issuerFromGrant(tokenUrl: string, grant: Record<string, string>): Promise<string | undefined> {
  try {
    const reply = await fetch(tokenUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(grant)
    });
    if (!reply.ok) {
      return undefined;
    }
    const { access_token: token } = (await reply.json()) as { access_token?: string };
    return token ? issuerClaimOf(token) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The `iss` claim of a JWT, read without verifying the signature.
 *
 * Safe here because the value is not trusted as an assertion: it is the *expectation* that
 * openid-client will then verify every real token against, and it was fetched over HTTPS from
 * the configured issuer using the client secret. Nothing is authenticated on the strength of it.
 */
function issuerClaimOf(token: string): string | undefined {
  const payload = token.split(".")[1];
  if (!payload) {
    return undefined;
  }
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { iss?: string };
    return claims.iss;
  } catch {
    return undefined;
  }
}

export function getOidcClient(): client.Configuration {
  if (!clientConfig) {
    throw new Error("OIDC client not initialised — call setupOidcClient() first");
  }
  return clientConfig;
}

export function oidcRedirectUri(): string {
  return config.get<string>("idam.redirectUri");
}

export function oidcScope(): string {
  return config.get<string>("idam.scope");
}

async function seedSimulatorUsers(issuer: URL): Promise<void> {
  // `issuer` is `http://localhost:5062/o`; trim the trailing `/o` for the
  // testing-support endpoint.
  const base = issuer.href.replace(/\/o\/?$/, "");
  for (const user of SIMULATOR_USERS) {
    try {
      await fetch(`${base}/testing-support/accounts`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(user)
      });
    } catch {
      // The simulator may not be reachable (unit tests, or cftlib not yet up).
      // Login fails loudly later; there is nothing useful to do here.
    }
  }
}
