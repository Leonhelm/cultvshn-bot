import type { WriteBatch } from "firebase-admin/firestore";
import type { TgCallbackQuery } from "../../shared/types/index.js";

export interface IncomingCallback {
  updateId: number;
  callbackQueryId: string;
  fromChatId: number;
  from: {
    id: number;
    first_name: string;
    last_name?: string | null;
    username?: string | null;
  };
  messageId: number | null;
  data: string | null;
}

export declare function saveIncomingCallbackBatch(
  batch: WriteBatch,
  updateId: number,
  callbackQuery: TgCallbackQuery,
): void;
export declare function getUnprocessedCallbacks(): Promise<IncomingCallback[]>;
export declare function deleteProcessedCallback(updateId: number): Promise<void>;
