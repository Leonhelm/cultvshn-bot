import { Timestamp } from "firebase-admin/firestore";
import { listAllItems, updateItemPrediction, terminateFirestore } from "../shared/lib/firestore.js";
import { logInfo, logError } from "../shared/lib/logger.js";
import { predictNextDate } from "../shared/shopping/predict.js";

const CHECK_INTERVAL_MS = 60 * 60 * 1000;
const SLEEP_STEP_MS = 5_000;

let running = true;

function shutdown(signal) {
  logInfo(`Received ${signal}, shutting down gracefully...`);
  running = false;
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

async function updatePredictions() {
  const items = await listAllItems();
  let updated = 0;

  for (const item of items) {
    const nextDate = predictNextDate(item.addedDates);
    const nextPredicted = nextDate ? Timestamp.fromDate(nextDate) : null;

    const currentMs = item.nextPredicted?.toMillis() ?? null;
    const newMs = nextPredicted?.toMillis() ?? null;

    if (currentMs !== newMs) {
      await updateItemPrediction(item.id, nextPredicted);
      updated++;
    }
  }

  logInfo(`Predictions updated: ${updated}/${items.length} item(s)`);
}

async function interruptibleSleep(ms) {
  let remaining = ms;
  while (running && remaining > 0) {
    const step = Math.min(SLEEP_STEP_MS, remaining);
    await new Promise((resolve) => setTimeout(resolve, step));
    remaining -= step;
  }
}

logInfo("Shopping-overview started");

while (running) {
  try {
    await updatePredictions();
  } catch (error) {
    logError("Error during prediction update", error);
  }

  if (running) {
    await interruptibleSleep(CHECK_INTERVAL_MS);
  }
}

logInfo("Shopping-overview loop stopped");

await terminateFirestore();
logInfo("Cleanup complete, exiting");
process.exit(0);
