import type { WriteBatch } from "firebase-admin/firestore";

export interface TrackedMessage {
  docId: string;
  chatId: number;
  messageId: number;
}

export declare function saveTrackedMessage(chatId: number, messageId: number): Promise<void>;
export declare function saveTrackedMessageBatch(
  batch: WriteBatch,
  chatId: number,
  messageId: number,
): void;
export declare function getExpiredTrackedMessages(cutoffDate: Date): Promise<TrackedMessage[]>;
export declare function deleteTrackedMessages(docIds: string[]): Promise<void>;
export declare function getTrackedMessageCountByChat(chatId: number): Promise<number>;
