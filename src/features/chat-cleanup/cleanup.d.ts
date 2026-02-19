import type { TgMessage } from "../../shared/types/index.js";

export declare function deletePreviousBotMessage(chatId: number): Promise<void>;
export declare function deleteUserMessage(message: TgMessage): Promise<void>;
