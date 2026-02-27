import { getMarketplaceType } from "./extract.js";

const TIMEOUT_MS = 15_000;

async function parseWildberries(url) {
  const match = url.match(/\/catalog\/(\d+)\//);
  if (!match) return null;
  const id = match[1];

  const apiUrl =
    `https://card.wb.ru/cards/v2/detail?appType=1&curr=rub&dest=-1257786&spp=30&nm=${id}`;

  const res = await fetch(apiUrl, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) return null;

  const json = await res.json();
  const product = json?.data?.products?.[0];
  if (!product) return null;

  const name = [product.brand, product.name].filter(Boolean).join(" / ");
  const price =
    typeof product.salePriceU === "number" ? product.salePriceU / 100 : null;

  if (!name || price == null) return null;
  return { name, price };
}

async function parseOzon(url) {
  const res = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "ru-RU,ru;q=0.9",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });
  if (!res.ok) return null;

  const html = await res.text();

  // Strategy 1: JSON-LD schema.org Product
  const ldBlocks = html.match(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  if (ldBlocks) {
    for (const block of ldBlocks) {
      try {
        const inner = block
          .replace(/<script[^>]*>/i, "")
          .replace(/<\/script>/i, "");
        const data = JSON.parse(inner);
        const entry = Array.isArray(data)
          ? data.find((d) => d["@type"] === "Product")
          : data;
        if (entry?.["@type"] === "Product" && entry.name) {
          const rawPrice = entry.offers?.price ?? entry.offers?.lowPrice;
          if (rawPrice != null) {
            return { name: entry.name, price: Number(rawPrice) };
          }
        }
      } catch {
        // try next block
      }
    }
  }

  // Strategy 2: meta tags
  const titleMeta = html.match(
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
  );
  const priceMeta = html.match(
    /<meta[^>]+property=["']product:price:amount["'][^>]+content=["']([^"']+)["']/i,
  );
  if (titleMeta?.[1] && priceMeta?.[1]) {
    const price = parseFloat(priceMeta[1]);
    if (!isNaN(price)) {
      return { name: titleMeta[1], price };
    }
  }

  // Strategy 3: __NEXT_DATA__
  const nextMatch = html.match(
    /<script id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i,
  );
  if (nextMatch) {
    try {
      const data = JSON.parse(nextMatch[1]);
      const page = data?.props?.pageProps;
      const name =
        page?.seo?.title ??
        page?.product?.name ??
        page?.layoutTrackingInfo?.title;
      const price =
        page?.product?.price?.cardPrice ??
        page?.product?.price?.originalPrice;
      if (name && price != null) {
        return { name, price: Number(price) };
      }
    } catch {
      // fall through
    }
  }

  return null;
}

export async function parseMarketplace(url) {
  const type = getMarketplaceType(url);
  if (type === "wildberries") return parseWildberries(url);
  if (type === "ozon") return parseOzon(url);
  return null;
}
