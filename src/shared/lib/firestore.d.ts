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
  checkedAt?: Timestamp;
}

export interface LinkDocWithId extends LinkDoc {
  id: string;
}

export function getChat(chatId: string): Promise<ChatDoc | null>;

export function saveLink(
  chatId: string,
  messageId: number,
  url: string,
): Promise<void>;

export function listLinks(): Promise<LinkDocWithId[]>;

export function getLink(docId: string): Promise<LinkDocWithId | null>;

export function deleteLink(docId: string): Promise<void>;

export function updateLinkCheckedAt(docId: string): Promise<void>;

export function upsertUnverifiedChat(
  chatId: string,
  info: { firstName: string; lastName?: string; username?: string },
): Promise<void>;
