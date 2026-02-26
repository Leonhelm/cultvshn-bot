export type ChatRole = "unverified" | "verified" | "admin";

export type ChatState = "awaiting-order-link" | null;

export interface ChatData {
  firstName: string;
  lastName: string | null;
  username: string | null;
  role: ChatRole;
  state: ChatState;
  createdAt: Date;
  updatedAt: Date;
}

export interface SaveChatInput {
  firstName: string;
  lastName?: string;
  username?: string;
}

export interface ChatWithId extends ChatData {
  chatId: number;
}

export declare function saveChat(chatId: number, data: SaveChatInput): Promise<void>;
export declare function getChat(chatId: number): Promise<ChatData | null>;
export declare function setChatState(chatId: number, state: ChatState): Promise<void>;
export declare function updateChatRole(chatId: number, role: ChatRole): Promise<void>;
export declare function getChatsByRole(role: ChatRole): Promise<ChatWithId[]>;
