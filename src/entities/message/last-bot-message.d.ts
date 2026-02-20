export declare function setLastBotMessage(chatId: number, messageId: number): Promise<void>;
export declare function getLastBotMessage(chatId: number): Promise<number | undefined>;
export declare function clearLastBotMessage(chatId: number): Promise<void>;
