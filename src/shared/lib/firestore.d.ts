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

export interface ItemDoc {
  name: string;
  chatId: string;
  createdAt: Timestamp;
  addedDates: Timestamp[];
  nextPredicted: Timestamp | null;
}

export interface ItemDocWithId extends ItemDoc {
  id: string;
}

export function getChat(chatId: string): Promise<ChatDoc | null>;

export function saveItem(
  chatId: string,
  name: string,
): Promise<{ created: boolean }>;

export function countItemsByChat(chatId: string): Promise<number>;

export function listItemsByChat(chatId: string): Promise<ItemDocWithId[]>;

export function listAllItems(): Promise<ItemDocWithId[]>;

export function getItem(docId: string): Promise<ItemDocWithId | null>;

export function deleteItem(docId: string): Promise<void>;

export function addItemDate(docId: string): Promise<boolean>;

export function updateItemPrediction(
  docId: string,
  nextPredicted: Timestamp | null,
): Promise<void>;

export function terminateFirestore(): Promise<void>;

export function upsertUnverifiedChat(
  chatId: string,
  info: { firstName: string; lastName?: string; username?: string },
): Promise<void>;
