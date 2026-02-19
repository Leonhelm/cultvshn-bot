import type { TgUser } from "../../shared/types/index.js";

export function formatUserName(user: TgUser): string {
  const parts = [user.first_name];
  if (user.last_name) {
    parts.push(user.last_name);
  }
  return parts.join(" ");
}
