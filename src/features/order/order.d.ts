import type { IncomingMessage, IncomingCallback } from "../../entities/message/index.js";

export declare function showQuickMenu(chatId: number, textPrefix?: string): Promise<void>;
export declare function promptForOrderLink(callbackQueryId: string, chatId: number): Promise<void>;
export declare function handleOrderLink(msg: IncomingMessage): Promise<void>;
export declare function handleListOrders(callbackQueryId: string, chatId: number): Promise<void>;
export declare function handleDeleteOrder(callback: IncomingCallback): Promise<void>;
export declare function handleCancelOrder(callbackQueryId: string, chatId: number): Promise<void>;
