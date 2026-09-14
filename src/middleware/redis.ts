import { expressSessionRedis } from "@hmcts-cft/express-session-redis";
import type { Express } from "express";
import { createClient, type RedisClientType } from "redis";

declare module "express-serve-static-core" {
  interface Locals {
    redis: RedisClientType;
  }
}

/**
 * Connect a Redis client, expose it as `app.locals.redis` for the healthcheck, and
 * mount the session-store middleware.
 *
 * The appeal being built lives in the session (see `#appeal`), so Redis is where a
 * part-finished appeal is held between requests. That is also why the session store
 * is Redis rather than memory even in development: "save and come back later" has to
 * survive a restart to be worth testing.
 */
export async function configureRedis(app: Express, config: { get(key: string): string }): Promise<RedisClientType> {
  const client = createClient({ url: config.get("redis.url") }) as RedisClientType;
  client.on("error", (err) => console.error("Redis Client Error", err));
  await client.connect();

  app.locals.redis = client;
  // The secret must be passed explicitly: express-session-redis falls back to
  // process.env.SESSION_SECRET and then a hard-coded default, so omitting it
  // silently signs cookies with a shared well-known key.
  app.use(expressSessionRedis({ redisConnection: client, sessionOptions: { secret: config.get("session.secret") } }));

  return client;
}
