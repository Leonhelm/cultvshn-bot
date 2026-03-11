import "dotenv/config";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name) {
  return process.env[name] || "";
}

export const env = {
  TG_BOT_API_TOKEN: requireEnv("TG_BOT_API_TOKEN"),
  FIREBASE_SERVICE_ACCOUNT_JSON: requireEnv("FIREBASE_SERVICE_ACCOUNT_JSON"),
  ADMIN_CHAT_IDS: optionalEnv("ADMIN_CHAT_IDS")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number),
};
