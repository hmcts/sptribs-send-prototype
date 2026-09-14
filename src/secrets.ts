import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPropertiesVolumeSecrets } from "@hmcts-cft/cloud-native-platform";

/**
 * Load the deployed secrets into `process.env`.
 *
 * **This module must not import node-config, and must not import anything that does.**
 * `config` snapshots `process.env` when it is first imported and never re-reads it, so any
 * module that reaches it before this has run freezes the placeholder values out of
 * `config/default.json` in place of the real secrets. `secrets.test.ts` enforces that by
 * walking the static import graph.
 *
 * That failure is close to invisible. The app boots, every page renders, the healthcheck is
 * green and the smoke tests pass — then sign-in fails at the token exchange because the
 * `client_secret` sent to IDAM is the literal `sptribs-frontend-idam-secret` from
 * `config/default.json`. IDAM answers `invalid_client: Client authentication failed`, which
 * is the same response it gives for a missing secret, a wrong secret and an unregistered
 * client — so it reads like a credentials or registration problem and not an ordering one.
 */
let loaded: Promise<Record<string, string>> | undefined;

export function loadSecrets(): Promise<Record<string, string>> {
  // Memoised: `server.ts` calls this before importing anything else, and `createApp` calls
  // it again as a safety net for any other entry point. In local dev the call goes to Azure
  // Key Vault, so doing it twice would be slow as well as pointless.
  loaded ??= fetchSecrets();
  return loaded;
}

function fetchSecrets(): Promise<Record<string, string>> {
  const chartPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "../charts/sptribs-send-prototype/values.yaml");
  // REDIS_URL is omitted so the local docker-compose Redis (config/default.json) wins over
  // any deployed-environment secret leaking into the process env.
  return getPropertiesVolumeSecrets({ chartPath, omit: ["REDIS_URL"] });
}
