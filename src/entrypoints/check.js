import { listLinks, terminateFirestore } from "../shared/lib/firestore.js";

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
  console.log(`[${checked}] ${link.id} — ${link.url}`);
}

await terminateFirestore();
