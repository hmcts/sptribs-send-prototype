import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guards the boot ordering that makes deployed secrets work at all.
 *
 * node-config reads `process.env` once, when it is first imported, and never again. So every
 * secret has to be in the environment before *any* module that reaches node-config is
 * imported. `server.ts` does that by importing only `./secrets.js` statically and pulling in
 * `./app.js` dynamically afterwards.
 *
 * It is an easy thing to undo by accident — adding a plain `import { createApp } from
 * "./app.js"` at the top of `server.ts` reads as a tidy-up and silently breaks every deployed
 * secret. Nothing catches it at runtime: the app boots, serves every page, passes its
 * healthcheck and passes the smoke tests. Only sign-in fails, with IDAM's
 * `invalid_client: Client authentication failed` — indistinguishable from a wrong secret or
 * an unregistered client, so the search starts in the wrong place. That is the bug this file
 * exists to prevent, and it reached a deployed environment once already.
 *
 * These are static import-graph assertions rather than a boot test because the failure is a
 * module-evaluation-order property. Importing the graph to observe it would itself initialise
 * node-config in this process and settle the question the wrong way.
 */

const SRC = import.meta.dirname;

/**
 * The module specifiers a file depends on statically.
 *
 * Covers `export … from` as well as `import … from`: a re-export is every bit as static as an
 * import, and the `#oidc` barrel is nothing but re-exports — miss those and the graph stops at
 * the barrel, one hop short of the `import config from "config"` that actually matters.
 *
 * Deliberately does not match `await import(...)`, because deferring an import is the fix.
 */
function staticImports(file: string): string[] {
  const source = readFileSync(file, "utf8");
  return [...source.matchAll(/^(?:import|export)\s[^;]*?from\s+["']([^"']+)["']/gms)].map((match) => match[1]);
}

/** Resolve a relative specifier written for the built output (`./app.js`) back onto its source. */
function resolveLocal(from: string, specifier: string): string | undefined {
  if (!specifier.startsWith(".")) {
    return undefined;
  }
  return path.resolve(path.dirname(from), specifier.replace(/\.js$/, ".ts"));
}

/**
 * Every first-party module reachable from `entry` through static imports only, including
 * `entry` itself. `#oidc`-style subpath imports are followed via package.json `imports`.
 */
function staticGraph(entry: string): Set<string> {
  const pkg = JSON.parse(readFileSync(path.join(SRC, "..", "package.json"), "utf8")) as {
    imports?: Record<string, string | { default?: string }>;
  };
  const subpaths = new Map(
    Object.entries(pkg.imports ?? {}).map(([key, value]) => {
      const target = typeof value === "string" ? value : (value.default ?? "");
      return [key, target];
    })
  );

  const seen = new Set<string>();
  const queue = [entry];
  while (queue.length > 0) {
    const file = queue.pop();
    if (!file || seen.has(file)) {
      continue;
    }
    seen.add(file);

    for (const specifier of staticImports(file)) {
      const subpath = subpaths.get(specifier);
      // A subpath target is repo-root-relative ("./src/libs/oidc/index.ts").
      const next = subpath ? path.join(SRC, "..", subpath) : resolveLocal(file, specifier);
      if (next) {
        queue.push(next);
      }
    }
  }
  return seen;
}

/** Does this file import node-config statically? */
function importsConfig(file: string): boolean {
  return staticImports(file).includes("config");
}

describe("secrets loading order", () => {
  const server = path.join(SRC, "server.ts");
  const secrets = path.join(SRC, "secrets.ts");

  it("should not let server.ts reach node-config through static imports", () => {
    // The whole bug in one assertion. `app.ts` is imported dynamically, so it must not
    // appear here; if someone makes that import static, `#oidc` comes with it and node-config
    // initialises before loadSecrets() runs.
    const offenders = [...staticGraph(server)].filter(importsConfig);

    expect(
      offenders.map((file) => path.relative(SRC, file)),
      "these are statically reachable from server.ts and import node-config, so config will snapshot process.env before the secrets are loaded — import them dynamically, after loadSecrets()"
    ).toEqual([]);
  });

  it("should keep secrets.ts itself clear of node-config", () => {
    const offenders = [...staticGraph(secrets)].filter(importsConfig);
    expect(offenders.map((file) => path.relative(SRC, file))).toEqual([]);
  });

  it("should load the secrets before importing app.js in server.ts", () => {
    const source = readFileSync(server, "utf8");
    expect(source, "app.js must be imported dynamically, not statically").not.toMatch(/^import\s[^;]*from\s+["']\.\/app\.js["']/m);
    expect(source).toMatch(/await\s+loadSecrets\(\)/);
    // Ordering within startServer: the await has to come first.
    expect(source.indexOf("await loadSecrets()")).toBeLessThan(source.indexOf('import("./app.js")'));
  });
});
