import { Timestamp } from "firebase-admin/firestore";

export declare const MSG_COMMANDS: string;
export declare const MSG_LIST_HEADER: string;
export declare const MSG_LIST_EMPTY: string;
export declare const MSG_ITEM_ADDED: string;
export declare const MSG_ITEM_UPDATED: string;
export declare const MSG_ITEM_TOO_LONG: string;
export declare const MSG_ITEM_LIMIT: string;
export declare const MSG_ITEM_NOT_FOUND: string;
export declare const MSG_UNVERIFIED: string;
export declare const MSG_INFO: string;
export declare const MSG_CB_ADDED: string;
export declare const MSG_CB_DELETED: string;
export declare const MSG_CB_NOT_FOUND: string;

export interface ListItem {
  id: string;
  name: string;
  addedDates?: Timestamp[];
  nextPredicted?: Timestamp | null;
  createdAt?: Timestamp;
}

export interface ListResult {
  text: string;
  reply_markup?: {
    inline_keyboard: Array<
      Array<{ text: string; callback_data: string }>
    >;
  };
}

export function msgList(items: ListItem[]): ListResult;
