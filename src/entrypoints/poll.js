import { env } from "../shared/config/env.js";
import { logInfo, logError, maskToken } from "../shared/lib/logger.js";
import { getUpdates, deleteWebhook } from "../shared/lib/telegram.js";
import { terminateFirestore } from "../shared/lib/firestore.js";
import { processUpdate } from "../shared/handlers/update.js";

let running = true;

function shutdown(signal) {
  logInfo(`Received ${signal}, shutting down gracefully...`);
  running = false;
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

let offset = 0;

async function pollLoop() {
  while (running) {
    try {
      const updates = await getUpdates(offset);

      for (const update of updates) {
        offset = update.update_id + 1;

        try {
          await processUpdate(update);
        } catch (err) {
          logError(`Error handling update ${update.update_id}`, err);
        }
      }
    } catch (error) {
      logError("Error fetching updates", error);
      if (running) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  logInfo("Poll loop stopped");
}

logInfo(`Bot started (poll mode), token: ${maskToken(env.TG_BOT_API_TOKEN)}`);

await deleteWebhook();
logInfo("Webhook removed (switching to poll mode)");

await pollLoop();

await terminateFirestore();
logInfo("Cleanup complete, exiting");
process.exit(0);
