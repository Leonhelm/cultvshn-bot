import type { TgUpdate, TgMessage } from "../types/index.js";

export declare function getUpdates(offset?: number): Promise<TgUpdate[]>;
export declare function sendMessage(chatId: number, text: string): Promise<TgMessage>;
export declare function deleteMessage(chatId: number, messageId: number): Promise<boolean>;
