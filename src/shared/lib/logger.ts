function timestamp(): string {
  return new Date().toISOString();
}

export function logInfo(message: string): void {
  console.log(`[${timestamp()}] INFO: ${message}`);
}

export function logError(message: string, error?: unknown): void {
  const details = error instanceof Error ? ` — ${error.message}` : "";
  console.error(`[${timestamp()}] ERROR: ${message}${details}`);
}

export function maskToken(token: string): string {
  if (token.length <= 4) return "****";
  return `***${token.slice(-4)}`;
}
