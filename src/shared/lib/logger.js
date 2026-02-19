function timestamp() {
  return new Date().toISOString();
}

export function logInfo(message) {
  console.log(`[${timestamp()}] INFO: ${message}`);
}

export function logError(message, error) {
  const details = error instanceof Error ? ` — ${error.message}` : "";
  console.error(`[${timestamp()}] ERROR: ${message}${details}`);
}

export function maskToken(token) {
  if (token.length <= 4) return "****";
  return `***${token.slice(-4)}`;
}
