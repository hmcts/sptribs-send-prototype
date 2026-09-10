/**
 * A citizen account to sign in as, wherever the suite is pointed.
 *
 * Local runs use the cftlib IDAM simulator, which seeds `TEST_CITIZEN_USER@mailinator.com`
 * and accepts any password. A deployed run has no seeded user, so one is created through
 * idam-testing-support-api's **burner** endpoint: unauthenticated, no Azure login and no Key
 * Vault access, which is what makes it usable from a Jenkins agent. Burner users live ~15
 * minutes, so nothing is left behind to clean up.
 *
 * That unauthenticated endpoint is the whole reason the authenticated journey can run against
 * Preview at all. The alternative — a long-lived test account — means either a user somebody
 * has to remember to create, or a credential in the pipeline.
 */

/** True when the suite is pointed at a deployed environment rather than localhost. */
export function isDeployed(baseUrl: string): boolean {
  return !/localhost|127\.0\.0\.1/.test(baseUrl);
}

export interface Citizen {
  email: string;
  password: string;
}

/** The user the cftlib IDAM simulator seeds. Any password is accepted. */
const SIMULATOR_CITIZEN: Citizen = { email: "TEST_CITIZEN_USER@mailinator.com", password: "password" };

/**
 * Burner users are rate limited to one per 3 minutes, so the whole suite shares one. Created
 * on first use rather than in a global setup hook, so a run that never signs in — the smoke
 * specs, say — does not create a user or need the API to be reachable at all.
 */
let deployedCitizen: Promise<Citizen> | undefined;

export function citizenFor(baseUrl: string): Promise<Citizen> {
  if (!isDeployed(baseUrl)) {
    return Promise.resolve(SIMULATOR_CITIZEN);
  }
  deployedCitizen ??= createBurnerCitizen(environmentFrom(baseUrl));
  return deployedCitizen;
}

/**
 * The environment a preview or AAT hostname belongs to.
 *
 * Preview deployments authenticate against **AAT** IDAM — the pipeline sets
 * `global.environment=aat` for PR builds — so a `*.preview.platform.hmcts.net` app needs an
 * AAT user, not a "preview" one. Getting this wrong creates the account in the wrong place
 * and the sign-in fails with a valid-looking user.
 */
export function environmentFrom(baseUrl: string): string {
  const host = new URL(baseUrl).hostname;
  if (host.includes(".preview.")) {
    return "aat";
  }
  const match = host.match(/\.(aat|demo|ithc|perftest)\./);
  return match ? match[1] : "aat";
}

async function createBurnerCitizen(environment: string): Promise<Citizen> {
  const url = `https://idam-testing-support-api.${environment}.platform.hmcts.net/test/idam/burner/users`;
  const password = process.env.IDAM_TEST_PASSWORD ?? "Pa55word11";
  // The email is required and has to be unique — the API answers a bare 400 without one.
  // @mailnesia.com because these are throwaway: it accepts anything and needs no mailbox.
  const email = `send-e2e-${crypto.randomUUID()}@mailnesia.com`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      password,
      user: { email, forename: "Test", surname: "Citizen", roleNames: ["citizen"] }
    })
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Could not create a burner citizen in ${environment} (HTTP ${response.status}): ${body.slice(0, 300)}`);
  }

  const created = JSON.parse(body) as { email?: string };
  return { email: created.email ?? email, password };
}
