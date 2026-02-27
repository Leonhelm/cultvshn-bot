import { listLinks, updateLinkCheckedAt } from "../lib/firestore.js";
import { logInfo, logError } from "../lib/logger.js";

const INTERVAL_MS = 30 * 60 * 1000;

/** @param {{ id: string, url: string }} link */
async function checkLink(link) {
  try {
    const res = await fetch(link.url, {
      method: "HEAD",
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) {
      await updateLinkCheckedAt(link.id);
      logInfo(`Monitor: link ${link.id} OK (${res.status})`);
    } else {
      logInfo(`Monitor: link ${link.id} returned ${res.status}`);
    }
  } catch (err) {
    logError(`Monitor: link ${link.id} failed`, err);
  }
}

async function runCheck() {
  try {
    const links = await listLinks();
    logInfo(`Monitor: checking ${links.length} links`);
    await Promise.allSettled(links.map(checkLink));
  } catch (err) {
    logError("Monitor: failed to list links", err);
  }
}

export function startMarketplaceMonitor() {
  logInfo("Monitor: started (interval 30m)");
  runCheck();
  setInterval(runCheck, INTERVAL_MS);
}
