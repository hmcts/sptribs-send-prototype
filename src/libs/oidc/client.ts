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
    clientConfig = await reconcileSimulatorIssuer(discovered, issuer, clientId, clientSecret);
  } else {
    clientConfig = discovered;
  }

  return clientConfig;
}

/**
 * Reconcile the local IDAM simulator's advertised issuer with the one it signs.
 *
 * openid-client v6 checks the `iss` claim on every token against the issuer from the
 * discovery document, and rejects any difference as `ClientError: invalid response
 * encountered` — which surfaces as a 500 on `/oauth2-callback` and makes local sign-in
 * impossible.
 *
 * The simulator has historically disagreed with itself here, because two settings
 * control the two values independently:
 *
 *     SIMULATOR_OPENID_BASE-URL   → the issuer discovery advertises
 *     SIMULATOR_JWT_ISSUER        → the `iss` claim tokens actually carry
 *
 * Older images advertised `http://localhost:5062/o` while signing the bare origin;
 * current ones sign `/o` too. Both have been seen on this stack, so rather than encode
 * either shape this asks the simulator directly: mint a token and read its `iss`. That
 * is the value being validated, so it is the one to expect — and it cannot go stale the
 * way a hardcoded transform did. (A previous version of this stripped a trailing `/o`
 * unconditionally, and started *causing* the mismatch once the image was updated.)
 *
 * Note the relaxation this is NOT: it does not skip the issuer check. The check still
 * happens, against a value read from the server rather than assumed. A token from any
 * other issuer is still rejected.
 *
 * Gated on `http:` by the caller, so it can never apply to a real IDAM — those are
 * https, and a genuine issuer mismatch there is an attack, not a misconfiguration.
 */
async function reconcileSimulatorIssuer(discovered: client.Configuration, issuer: URL, clientId: string, clientSecret: string): Promise<client.Configuration> {
  // `serverMetadata()` returns the document plus a `supportsPKCE()` helper. Spreading
  // takes the helper along, which is not valid metadata, so it is dropped by name —
  // the rest of the document is carried over untouched.
  const { supportsPKCE: _supportsPKCE, ...metadata } = discovered.serverMetadata();
  const asserted = await assertedIssuer(issuer, clientId, clientSecret);
  if (!asserted || asserted === metadata.issuer) {
    return discovered;
  }

  const reconciled = new client.Configuration({ ...metadata, issuer: asserted }, clientId, clientSecret);
  // Re-applied because this is a new Configuration, not the discovered one: the
  // simulator is plain http and openid-client refuses insecure requests by default.
  client.allowInsecureRequests(reconciled);
  return reconciled;
}

/**
 * The `iss` the simulator actually signs, read from a token it mints.
 *
 * Uses the password grant against a throwaway account — the simulator issues a token for
 * any username, and only the claim is wanted, not a session. Returns undefined if
 * anything goes wrong, in which case the discovered issuer stands: a sign-in that then
 * fails reports the real mismatch, which is more useful than a guess.
 */
export async function assertedIssuer(issuer: URL, clientId: string, clientSecret: string): Promise<string | undefined> {
  const base = issuer.href.replace(/\/o\/?$/, "");
  try {
    const reply = await fetch(`${base}/o/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "password",
        client_id: clientId,
        client_secret: clientSecret,
        username: ISSUER_PROBE_USER,
        password: "probe",
        scope: "openid profile roles"
      })
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

/** The `iss` claim of a JWT, without verifying it — this is a local simulator probe. */
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
