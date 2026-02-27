export interface TgUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

export interface TgMessage {
  message_id: number;
  chat: { id: number };
  from?: TgUser;
  text?: string;
  date: number;
}

export interface TgUpdate {
  update_id: number;
  message?: TgMessage;
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

export function deleteMessage(
  chatId: number | string,
  messageId: number,
): Promise<boolean>;
