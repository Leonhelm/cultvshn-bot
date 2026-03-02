import { listLinks, terminateFirestore } from "../shared/lib/firestore.js";
import { logInfo, logError } from "../shared/lib/logger.js";

const CHECK_INTERVAL_MS = 10 * 60 * 1000;
const SLEEP_STEP_MS = 5_000;

let running = true;

function shutdown(signal) {
  logInfo(`Received ${signal}, shutting down gracefully...`);
  running = false;
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

async function checkLinks() {
  const links = await listLinks();

  // Sort: no checkedAt first (never checked = highest priority), then oldest first
  const sorted = links.slice().sort((a, b) => {
    const aTime = a.checkedAt?.toMillis() ?? 0;
    const bTime = b.checkedAt?.toMillis() ?? 0;
    return aTime - bTime;
  });

  for (const link of sorted) {
    const checked = link.checkedAt
      ? new Date(link.checkedAt.toMillis()).toISOString()
      : "never";
    logInfo(`[${checked}] ${link.id} — ${link.url}`);
  }

  logInfo(`Overview complete: ${sorted.length} link(s)`);
}

async function interruptibleSleep(ms) {
  let remaining = ms;
  while (running && remaining > 0) {
    const step = Math.min(SLEEP_STEP_MS, remaining);
    await new Promise((resolve) => setTimeout(resolve, step));
    remaining -= step;
  }
}

logInfo("Overview-marketplaces started");

while (running) {
  try {
    await checkLinks();
  } catch (error) {
    logError("Error during link check", error);
  }

  if (running) {
    await interruptibleSleep(CHECK_INTERVAL_MS);
  }
}

logInfo("Overview-marketplaces loop stopped");

await terminateFirestore();
logInfo("Cleanup complete, exiting");
process.exit(0);
