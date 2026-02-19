import { env } from "../config/index.js";
import { logInfo, logError } from "../lib/index.js";
import type { TgResponse, TgUpdate, TgMessage } from "../types/index.js";

const BASE_URL = `https://api.telegram.org/bot${env.TG_BOT_API_TOKEN}`;

async function callApi<T>(method: string, body?: Record<string, unknown>): Promise<T> {
  const url = `${BASE_URL}/${method}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = (await response.json()) as TgResponse<T>;

  if (!data.ok) {
    throw new Error(`Telegram API error [${method}]: ${data.description ?? "unknown"}`);
  }

  return data.result;
}

export async function getUpdates(offset?: number): Promise<TgUpdate[]> {
  logInfo(`getUpdates${offset != null ? ` (offset=${offset})` : ""}`);
  return callApi<TgUpdate[]>("getUpdates", {
    offset,
    timeout: 30,
  });
}

export async function sendMessage(chatId: number, text: string): Promise<TgMessage> {
  logInfo(`sendMessage to chat ${chatId}`);
  return callApi<TgMessage>("sendMessage", {
    chat_id: chatId,
    text,
  });
}

export async function deleteMessage(chatId: number, messageId: number): Promise<boolean> {
  logInfo(`deleteMessage ${messageId} from chat ${chatId}`);
  try {
    return await callApi<boolean>("deleteMessage", {
      chat_id: chatId,
      message_id: messageId,
    });
  } catch (error) {
    logError(`Failed to delete message ${messageId}`, error);
    return false;
  }
}
