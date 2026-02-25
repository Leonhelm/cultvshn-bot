import type { TgUpdate, TgMessage, TgInlineKeyboardMarkup } from "../types/index.js";

export declare function getUpdates(offset?: number): Promise<TgUpdate[]>;
export declare function sendMessage(chatId: number, text: string): Promise<TgMessage>;
export declare function sendMessageWithMarkup(
  chatId: number,
  text: string,
  replyMarkup: TgInlineKeyboardMarkup,
  parseMode?: string,
): Promise<TgMessage>;
export declare function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<boolean>;
export declare function deleteMessage(chatId: number, messageId: number): Promise<boolean>;
