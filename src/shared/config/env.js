import "dotenv/config";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  TG_BOT_API_TOKEN: requireEnv("TG_BOT_API_TOKEN"),
  TG_BOT_ADMIN: requireEnv("TG_BOT_ADMIN"),
  FIREBASE_SERVICE_ACCOUNT_JSON: requireEnv("FIREBASE_SERVICE_ACCOUNT_JSON"),
};
