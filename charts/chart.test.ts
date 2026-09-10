import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The chart has to agree with `config/custom-environment-variables.json`, and nothing else
 * checks that they do.
 *
 * `getPropertiesVolumeSecrets` mounts each Key Vault secret as a file and injects it as an
 * environment variable named after the secret's **alias**, falling back to the file name when
 * there is none. So a secret listed as a bare string arrives as `process.env["idam-ui-secret"]`
 * — a name node-config never looks up.
 *
 * Nothing fails at boot when that happens. The app starts, serves every page, passes its
 * healthcheck and passes the smoke tests; then sign-in dies at the token exchange because
 * `client_secret` is empty, and the pod log says only "server responded with an error in the
 * response body". That is why this is a test and not a comment.
 */

const CHART_DIR = path.join(import.meta.dirname, "sptribs-send-prototype");

/** The env var names `config/custom-environment-variables.json` actually reads. */
function configuredEnvVars(): Set<string> {
  const raw = readFileSync(path.join(import.meta.dirname, "..", "config", "custom-environment-variables.json"), "utf8");
  const names = new Set<string>();
  const collect = (node: unknown): void => {
    if (typeof node === "string") {
      names.add(node);
      return;
    }
    if (node && typeof node === "object") {
      for (const value of Object.values(node)) {
        // node-config's long form: { "__name": "VAR", "__format": "number" }
        collect(value && typeof value === "object" && "__name" in value ? (value as { __name: unknown }).__name : value);
      }
    }
  };
  collect(JSON.parse(raw));
  return names;
}

/**
 * The secrets a values file declares, as `{ name, alias }`.
 *
 * Parsed with a line reader rather than a YAML library: the `.template.yaml` files contain
 * `${SERVICE_FQDN}`-style placeholders that the pipeline substitutes with envsubst, and those
 * are not valid YAML values in every position.
 */
function declaredSecrets(file: string): { name: string; alias?: string }[] {
  const lines = readFileSync(path.join(CHART_DIR, file), "utf8").split("\n");
  const secrets: { name: string; alias?: string }[] = [];
  let inSecrets = false;

  for (const line of lines) {
    if (/^\s*secrets:\s*$/.test(line)) {
      inSecrets = true;
      continue;
    }
    if (!inSecrets) {
      continue;
    }

    const named = line.match(/^\s*-\s*name:\s*(\S+)\s*$/);
    if (named) {
      secrets.push({ name: named[1] });
      continue;
    }
    const alias = line.match(/^\s*alias:\s*(\S+)\s*$/);
    if (alias && secrets.length > 0) {
      secrets[secrets.length - 1].alias = alias[1];
      continue;
    }
    const bare = line.match(/^\s*-\s*([a-z0-9][a-z0-9-]*)\s*$/);
    if (bare) {
      secrets.push({ name: bare[1] });
      continue;
    }
    // Anything else ends the block: a new key, a comment at a lower indent, or a blank line
    // followed by one.
    if (line.trim() !== "" && !line.trim().startsWith("#")) {
      inSecrets = false;
    }
  }
  return secrets;
}

describe.each(["values.yaml", "values.preview.template.yaml"])("%s", (file) => {
  it("should declare some secrets, so a passing test means something", () => {
    expect(declaredSecrets(file).length).toBeGreaterThan(0);
  });

  it("should give every secret an alias", () => {
    // Without one the env var is named after the Key Vault secret — `idam-ui-secret`, not
    // `OIDC_CLIENT_SECRET` — and nothing reads it.
    for (const secret of declaredSecrets(file)) {
      expect(secret.alias, `${secret.name} has no alias, so it would be injected as process.env["${secret.name}"]`).toBeDefined();
    }
  });

  it("should only use aliases the app actually reads", () => {
    const configured = configuredEnvVars();
    for (const { name, alias } of declaredSecrets(file)) {
      if (!alias) {
        continue;
      }
      expect(configured, `${name} is aliased to ${alias}, which custom-environment-variables.json never reads`).toContain(alias);
    }
  });

  it("should provide the secrets sign-in and the CCD submit cannot work without", () => {
    const aliases = declaredSecrets(file).map((secret) => secret.alias);

    // The two that produced a working deployment where nobody could sign in.
    expect(aliases, "no OIDC client secret: the token exchange will fail with invalid_client").toContain("OIDC_CLIENT_SECRET");
    expect(aliases, "no S2S secret: the CCD submit will fail once somebody has signed in").toContain("S2S_SECRET");
  });
});
