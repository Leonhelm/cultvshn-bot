const MARKETPLACE_HOSTS = ["ozon.ru", "wildberries.ru"];

/** @param {string} hostname */
function isMarketplaceHost(hostname) {
  return MARKETPLACE_HOSTS.some(
    (h) => hostname === h || hostname.endsWith(`.${h}`),
  );
}

/** @param {string} urlStr */
function isMarketplaceUrl(urlStr) {
  try {
    const u = new URL(urlStr);
    return (
      (u.protocol === "http:" || u.protocol === "https:") &&
      isMarketplaceHost(u.hostname)
    );
  } catch {
    return false;
  }
}

/**
 * Extract the first marketplace URL from a Telegram message.
 * Checks entities first (most reliable), then falls back to regex.
 * @param {string | undefined} text
 * @param {Array<{type: string, offset: number, length: number, url?: string}> | undefined} entities
 * @returns {string | null}
 */
export function extractMarketplaceLink(text, entities) {
  if (text && entities) {
    for (const e of entities) {
      let candidate;
      if (e.type === "url") {
        candidate = text.substring(e.offset, e.offset + e.length);
      } else if (e.type === "text_link" && e.url) {
        candidate = e.url;
      }
      if (candidate && isMarketplaceUrl(candidate)) {
        return candidate;
      }
    }
  }

  if (text) {
    const match = text.match(
      /https?:\/\/(?:www\.)?(?:ozon\.ru|wildberries\.ru)\S*/i,
    );
    if (match && isMarketplaceUrl(match[0])) {
      return match[0];
    }
  }

  return null;
}
