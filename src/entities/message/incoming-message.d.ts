import type { WriteBatch } from "firebase-admin/firestore";
import type { TgMessage } from "../../shared/types/index.js";

export interface IncomingMessage {
  updateId: number;
  chatId: number;
  messageId: number;
  from: {
    id: number;
    first_name: string;
    last_name?: string | null;
    username?: string | null;
  };
  text?: string | null;
  date: number;
}

export declare function saveIncomingMessageBatch(
  batch: WriteBatch,
  updateId: number,
  message: TgMessage,
): void;
export declare function saveIncomingMessage(
  updateId: number,
  message: TgMessage,
): Promise<void>;
export declare function getUnprocessedMessages(): Promise<IncomingMessage[]>;
export declare function deleteProcessedMessage(updateId: number): Promise<void>;
