import { createApp } from "./app.js";

async function startServer() {
  const app = await createApp();

  // Imported after createApp, not at the top: createApp fetches the deployed secrets
  // before it loads node-config, and node-config snapshots process.env on first import.
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
