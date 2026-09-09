import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPropertiesVolumeSecrets, hc, healthcheck, monitoringMiddleware } from "@hmcts-cft/cloud-native-platform";
import { configureCookieManager, configureGovuk, configureHelmet, configureNonce, errorHandler, notFoundHandler } from "@hmcts-cft/express-govuk-starter";
import { createSimpleRouter } from "@hmcts-cft/simple-router";
import cookieParser from "cookie-parser";
import type { Express } from "express";
import express from "express";
import { setUser, setupOidcClient } from "#oidc";
import { translateErrors } from "#zod-validation";
import { csrf } from "./middleware/csrf.js";
import { allowIdamFormAction } from "./middleware/form-action.js";
import { configureRedis } from "./middleware/redis.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function createApp(): Promise<Express> {
  // REDIS_URL is omitted so the local docker-compose Redis (config/default.json)
  // wins over any deployed-environment secret leaking into the process env.
  await getPropertiesVolumeSecrets({
    chartPath: path.join(__dirname, "../charts/sptribs-send-prototype/values.yaml"),
    omit: ["REDIS_URL"]
  });

  // Imported dynamically and only after the secrets are in place: node-config
  // snapshots process.env at first import.
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

  await configureCookieManager(app, {
    categories: {
      essential: ["connect.sid"],
      analytics: [],
      preferences: ["language"]
    }
  });

  app.use(setUser());
  app.use(csrf());
  app.use(translateErrors());

  app.use(await createSimpleRouter({ path: path.join(__dirname, "pages") }));
  app.use(notFoundHandler());
  app.use(errorHandler());

  return app;
}
