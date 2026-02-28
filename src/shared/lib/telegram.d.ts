export interface TgUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

export interface TgMessageEntity {
  type: string;
  offset: number;
  length: number;
  url?: string;
}

export interface TgMessage {
  message_id: number;
  chat: { id: number };
  from?: TgUser;
  text?: string;
  entities?: TgMessageEntity[];
  date: number;
}

export interface TgCallbackQuery {
  id: string;
  from: TgUser;
  message?: TgMessage;
  data?: string;
}

export interface TgUpdate {
  update_id: number;
  message?: TgMessage;
  callback_query?: TgCallbackQuery;
}

export function getUpdates(
  offset: number,
  timeout?: number,
): Promise<TgUpdate[]>;

export function sendMessage(
  chatId: number | string,
  text: string,
  extra?: Record<string, unknown>,
): Promise<{ message_id: number }>;

export function answerCallbackQuery(
  callbackQueryId: string,
  text?: string,
): Promise<boolean>;

export function editMessageText(
  chatId: number | string,
  messageId: number,
  text: string,
  extra?: Record<string, unknown>,
): Promise<TgMessage>;

export function deleteMessage(
  chatId: number | string,
  messageId: number,
): Promise<boolean>;
