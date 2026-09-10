// `./secrets.js` is the only static import here, and `app.js` is imported dynamically
// below, because the secrets have to be in `process.env` before node-config is first
// imported — it snapshots the environment then and never re-reads it.
//
// Deferring the `config` import in *this* file was not enough, and that was the bug: a
// static `import { createApp } from "./app.js"` pulls in `#oidc` and `#ccd`, both of which
// statically import node-config, so config was fully initialised from the placeholders in
// `config/default.json` before `createApp()`'s first line ever ran.
import { loadSecrets } from "./secrets.js";

async function startServer() {
  await loadSecrets();

  // Dynamic, so it resolves only after loadSecrets() has populated process.env.
  const { createApp } = await import("./app.js");
  const app = await createApp();

  // Reading the port from config rather than straight from process.env keeps
  // config/default.json the one place the local port is written down —
  // custom-environment-variables.json already maps PORT onto it for deployments.
  const { default: config } = await import("config");
  const port = config.get<number>("server.port");

  const server = app.listen(port, () => {
    console.log(`sptribs-send-prototype running on http://localhost:${port}`);
  });

  return server;
}

const server = await startServer();

function shutdown(signal: string) {
  console.log(`${signal} received: closing HTTP server...`);
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
