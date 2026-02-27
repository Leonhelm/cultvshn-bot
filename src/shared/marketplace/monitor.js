import { listLinks, updateLinkData } from "../lib/firestore.js";
import { logInfo, logError } from "../lib/logger.js";
import { parseMarketplace } from "./parser.js";

const INTERVAL_MS = 30 * 60 * 1000;

async function checkLink(link) {
  try {
    const result = await parseMarketplace(link.url);
    if (result) {
      await updateLinkData(link.id, {
        name: result.name,
        price: result.price,
        invalidAt: false,
      });
      logInfo(`Monitor: link ${link.id} OK — ${result.name} @ ${result.price}`);
    } else {
      await updateLinkData(link.id, { invalidAt: true });
      logInfo(`Monitor: link ${link.id} parse failed → invalidAt`);
    }
  } catch (err) {
    logError(`Monitor: link ${link.id} error`, err);
    try {
      await updateLinkData(link.id, { invalidAt: true });
    } catch (fsErr) {
      logError(`Monitor: link ${link.id} failed to write invalidAt`, fsErr);
    }
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
