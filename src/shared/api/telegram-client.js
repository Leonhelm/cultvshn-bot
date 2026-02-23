import { env } from "../config/index.js";
import { logInfo, logError } from "../lib/index.js";

const BASE_URL = `https://api.telegram.org/bot${env.TG_BOT_API_TOKEN}`;

async function callApi(method, body) {
  const url = `${BASE_URL}/${method}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();

  if (!data.ok) {
    throw new Error(`Telegram API error [${method}]: ${data.description ?? "unknown"}`);
  }

  return data.result;
}

export async function getUpdates(offset) {
  logInfo(`getUpdates${offset != null ? ` (offset=${offset})` : ""}`);
  return callApi("getUpdates", {
    offset,
    timeout: 8, // важно оставить меньше 10 - в Node.js 18 есть проблема с этим https://github.com/nodejs/undici/issues/4405
  });
}

export async function sendMessage(chatId, text) {
  logInfo(`sendMessage to chat ${chatId}`);
  return callApi("sendMessage", {
    chat_id: chatId,
    text,
  });
}

export async function deleteMessage(chatId, messageId) {
  logInfo(`deleteMessage ${messageId} from chat ${chatId}`);
  try {
    return await callApi("deleteMessage", {
      chat_id: chatId,
      message_id: messageId,
    });
  } catch (error) {
    logError(`Failed to delete message ${messageId}`, error);
    return false;
  }
}
