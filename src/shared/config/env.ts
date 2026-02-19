import "dotenv/config";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  TG_BOT_API_TOKEN: requireEnv("TG_BOT_API_TOKEN"),
  TG_BOT_ADMIN: requireEnv("TG_BOT_ADMIN"),
} as const;
