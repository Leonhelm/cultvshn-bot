import { env } from "../shared/config/index.js";
import { logInfo, logError, maskToken } from "../shared/lib/logger";

let running = true;

function shutdown(signal) {
  logInfo(`Received ${signal}, shutting down gracefully...`);
  running = false;
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

async function getUpdates(offset) {
  // TODO: заглушка long-polling telegram bot
  return new Promise(r => setTimeout(() => r([]), 5000))
}

async function fetchUpdates() {
  let offset = 0;
  const updates = await getUpdates(offset);

  if (updates.length === 0) return;

  logInfo(`Received ${updates.length} updates`);
}

async function pollLoop() {
  while (running) {
    try {
      await fetchUpdates();
    } catch (error) {
      logError("Error fetching updates", error);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  logInfo("Poll loop stopped");
}

logInfo(`Bot started (poll mode), token: ${maskToken(env.TG_BOT_API_TOKEN)}`);

await pollLoop();
