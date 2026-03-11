import { Timestamp } from "firebase-admin/firestore";

export interface ChatDoc {
  firstName: string;
  lastName?: string;
  username?: string;
  role: "unverified" | "verified" | "admin" | "rejected";
  state?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ChatDocWithId extends ChatDoc {
  chatId: string;
}

export function getChat(chatId: string): Promise<ChatDoc | null>;

export function terminateFirestore(): Promise<void>;

export function updateChatRole(
  chatId: string,
  role: ChatDoc["role"],
): Promise<void>;

export function getUnverifiedChats(): Promise<ChatDocWithId[]>;

export function upsertUnverifiedChat(
  chatId: string,
  info: { firstName: string; lastName?: string; username?: string },
): Promise<void>;
