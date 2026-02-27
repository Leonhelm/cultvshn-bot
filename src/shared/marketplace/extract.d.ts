export function extractMarketplaceLink(
  text: string | undefined,
  entities: Array<{ type: string; offset: number; length: number; url?: string }> | undefined,
): string | null;

export function getMarketplaceType(url: string): 'ozon' | 'wildberries' | null;
