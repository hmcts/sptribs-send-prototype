import path from "node:path";
import { fileURLToPath } from "node:url";
import { hc, healthcheck, monitoringMiddleware } from "@hmcts-cft/cloud-native-platform";
import { configureGovuk, configureHelmet, configureNonce, errorHandler, notFoundHandler } from "@hmcts-cft/express-govuk-starter";
import { createSimpleRouter } from "@hmcts-cft/simple-router";
import cookieParser from "cookie-parser";
import type { Express } from "express";
import express from "express";
import { setUser, setupOidcClient } from "#oidc";
import { translateErrors } from "#zod-validation";
import { cookieManager } from "./middleware/cookies.js";
import { csrf } from "./middleware/csrf.js";
import { allowIdamFormAction } from "./middleware/form-action.js";
import { configureRedis } from "./middleware/redis.js";
import { loadSecrets } from "./secrets.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function createApp(): Promise<Express> {
  // A safety net, not the real load: `server.ts` calls this before importing this module at
  // all, which is the only ordering that works. By the time createApp runs, the static
  // imports above have already initialised node-config via `#oidc` — so loading secrets
  // here for the first time would be too late. Memoised, so the normal path is a no-op.
  await loadSecrets();

  const { default: config } = await import("config");
  const isDev = process.env.NODE_ENV !== "production";
  const app = express();

  app.set("trust proxy", 1);
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(monitoringMiddleware(config.get("applicationInsights")));
  app.use(configureNonce());
  app.use(configureHelmet());
  // After configureHelmet, because it extends the policy that middleware sets.
  app.use(allowIdamFormAction(config.get("idam.issuer")));

  await configureRedis(app, config);
  await setupOidcClient();
  app.use(
    healthcheck({
      checks: {
        redis: hc.raw(() => app.locals.redis.ping())
      }
    })
  );

  await configureGovuk(app, [__dirname], {
    nunjucksGlobals: {
      serviceName: config.get("service.name"),
      contactEmail: config.get("service.contactEmail"),
      contactPhone: config.get("service.contactPhone")
    },
    assetOptions: isDev
      ? {
          viteConfigFile: path.join(__dirname, "../vite.config.ts"),
          entries: {
            index_js: "/src/assets/js/main.ts",
            index_css: "/src/assets/css/index.scss"
          }
        }
      : // In a built tree __dirname *is* dist/ (tsconfig rootDir: "src"), and
        // configureAssets looks for `<distPath>/assets`.
        { distPath: __dirname }
  });

  // Our own, not the starter's configureCookieManager: that one also registers its own
  // GET /cookies on the starter's layout, whose header loses the service name under
  // govuk-frontend 6. See src/middleware/cookies.ts. The preferences page is an ordinary
  // page under src/pages/(shared)/(cookies)/.
  app.use(
    cookieManager({
      essential: ["connect.sid", "cookie_policy", "cookies_preferences_set"],
      analytics: [],
      preferences: ["language"]
    })
  );

  app.use(setUser());
  app.use(csrf());
  app.use(translateErrors());

  app.use(await createSimpleRouter({ path: path.join(__dirname, "pages") }));
  app.use(notFoundHandler());
  app.use(errorHandler());

  return app;
}
