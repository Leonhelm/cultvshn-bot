import { createServer } from "node:http";
import { env } from "../shared/config/env.js";
import { logInfo, logError, maskToken } from "../shared/lib/logger.js";
import { setWebhook } from "../shared/lib/telegram.js";
import { terminateFirestore } from "../shared/lib/firestore.js";
import { processUpdate } from "../shared/handlers/update.js";

const WEBHOOK_URL = process.env.WEBHOOK_URL;
const WEBHOOK_PORT = Number(process.env.WEBHOOK_PORT) || 8443;
const WEBHOOK_SECRET_TOKEN = process.env.WEBHOOK_SECRET_TOKEN;

if (!WEBHOOK_URL) {
  throw new Error("Missing required environment variable: WEBHOOK_URL");
}
if (!WEBHOOK_SECRET_TOKEN) {
  throw new Error("Missing required environment variable: WEBHOOK_SECRET_TOKEN");
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString()));
    req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
  if (req.method !== "POST") {
    res.writeHead(200).end();
    return;
  }

  const secret = req.headers["x-telegram-bot-api-secret-token"];
  if (secret !== WEBHOOK_SECRET_TOKEN) {
    res.writeHead(403).end();
    return;
  }

  let body;
  try {
    body = await readBody(req);
  } catch {
    res.writeHead(400).end();
    return;
  }

  res.writeHead(200).end();

  try {
    const update = JSON.parse(body);
    await processUpdate(update);
  } catch (err) {
    logError("Error processing webhook update", err);
  }
});

function shutdown(signal) {
  logInfo(`Received ${signal}, shutting down gracefully...`);
  server.close(async () => {
    await terminateFirestore();
    logInfo("Cleanup complete, exiting");
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

logInfo(`Bot started (webhook mode), token: ${maskToken(env.TG_BOT_API_TOKEN)}`);

await setWebhook(WEBHOOK_URL, WEBHOOK_SECRET_TOKEN);
logInfo(`Webhook set: ${WEBHOOK_URL}`);

server.listen(WEBHOOK_PORT, () => {
  logInfo(`HTTP server listening on port ${WEBHOOK_PORT}`);
});
