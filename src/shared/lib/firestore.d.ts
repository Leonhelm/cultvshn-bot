import { Timestamp } from "firebase-admin/firestore";

export interface ChatDoc {
  firstName: string;
  lastName?: string;
  username?: string;
  role: "unverified" | "verified" | "admin";
  state?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface LinkDoc {
  url: string;
  chatId: string;
  createdAt: Timestamp;
}

export function getChat(chatId: string): Promise<ChatDoc | null>;

export function saveLink(
  chatId: string,
  messageId: number,
  url: string,
): Promise<void>;

export function upsertUnverifiedChat(
  chatId: string,
  info: { firstName: string; lastName?: string; username?: string },
): Promise<void>;
